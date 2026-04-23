import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encrypt";
import nodemailer from "nodemailer";

function verifyCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const invocationId = `vercel-${Date.now()}`;

  const { data: batch, error: lockErr } = await supabase.rpc("lock_queue_batch", {
    p_limit: 10,
    p_locked_by: invocationId,
  });

  if (lockErr || !batch || batch.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const queueRow of batch) {
    try {
      const { data: emailSend } = await supabase
        .from("email_sends")
        .select("*, email_accounts(*), campaigns(sender_profiles(from_name, reply_to, daily_limit))")
        .eq("id", queueRow.email_send_id)
        .single();

      if (!emailSend || emailSend.status !== "ready") {
        await supabase
          .from("email_send_queue")
          .update({ status: "failed", last_error: "email_send not ready" })
          .eq("id", queueRow.id);
        continue;
      }

      const account = emailSend.email_accounts as {
        from_email: string;
        smtp_host: string;
        smtp_port: number;
        smtp_user: string;
        smtp_pass_encrypted: string;
        daily_sent: number;
        daily_reset_at: string;
      } | null;

      if (!account) {
        await supabase
          .from("email_send_queue")
          .update({ status: "failed", last_error: "No email account" })
          .eq("id", queueRow.id);
        continue;
      }

      const profile = (emailSend.campaigns as unknown as {
        sender_profiles: { from_name: string; reply_to: string | null; daily_limit: number }
      })?.sender_profiles;

      const today = new Date().toISOString().slice(0, 10);
      const dailySent = account.daily_reset_at === today ? account.daily_sent : 0;
      if (profile && dailySent >= profile.daily_limit) {
        await supabase
          .from("email_send_queue")
          .update({ status: "pending", locked_by: null, locked_at: null,
            scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
          .eq("id", queueRow.id);
        continue;
      }

      const { data: lead } = await supabase
        .from("leads")
        .select("email, first_name, last_name")
        .eq("id", emailSend.lead_id)
        .single();

      if (!lead?.email) {
        await supabase
          .from("email_send_queue")
          .update({ status: "failed", last_error: "No lead email" })
          .eq("id", queueRow.id);
        continue;
      }

      const smtpPass = decrypt(account.smtp_pass_encrypted);
      const transporter = nodemailer.createTransport({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_port === 465,
        auth: { user: account.smtp_user, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"${profile?.from_name ?? "PixelReach"}" <${account.from_email}>`,
        to: lead.email,
        replyTo: profile?.reply_to ?? undefined,
        subject: emailSend.subject,
        html: emailSend.body_html,
        headers: {
          "Message-ID": `<${emailSend.tracking_id}@pixelreach.ai>`,
          "X-Tracking-ID": emailSend.tracking_id,
        },
      });

      const now = new Date().toISOString();
      await Promise.all([
        supabase.from("email_sends").update({ status: "sent", sent_at: now }).eq("id", emailSend.id),
        supabase.from("email_send_queue").update({ status: "sent" }).eq("id", queueRow.id),
        supabase.from("leads").update({ status: "emailed" }).eq("id", emailSend.lead_id),
        supabase.from("email_accounts").update({
          daily_sent: dailySent + 1,
          daily_reset_at: today,
        }).eq("id", emailSend.email_account_id),
        supabase.rpc("increment_campaign_sent", { campaign_id: emailSend.campaign_id }).maybeSingle(),
        supabase.from("tracking_events").insert({
          email_send_id: emailSend.id,
          event_type: "sent",
        }),
      ]);

      sent++;
    } catch (err) {
      console.error("process-send-queue error:", err);
      await supabase
        .from("email_send_queue")
        .update({
          status: "failed",
          last_error: String(err),
          retry_count: (batch.find((b: { id: string }) => b.id === queueRow.id)?.retry_count ?? 0) + 1,
          locked_by: null,
        })
        .eq("id", queueRow.id);
    }
  }

  return NextResponse.json({ sent });
}
