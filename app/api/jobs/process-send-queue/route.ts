import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encrypt";
import nodemailer from "nodemailer";

function verifyCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

function queueDelay(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function recoverPrematureFailures(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const { data: failedRows } = await supabase
    .from("email_send_queue")
    .select("id, email_send_id")
    .eq("status", "failed")
    .eq("last_error", "email_send not ready")
    .limit(50);

  if (!failedRows || failedRows.length === 0) return;

  const { data: sends } = await supabase
    .from("email_sends")
    .select("id, status")
    .in("id", failedRows.map((row) => row.email_send_id))
    .in("status", ["pending_gen", "ready"]);

  const resumableSendIds = new Set((sends ?? []).map((send) => send.id));
  const resumableQueueIds = failedRows
    .filter((row) => resumableSendIds.has(row.email_send_id))
    .map((row) => row.id);

  if (resumableQueueIds.length === 0) return;

  await supabase
    .from("email_send_queue")
    .update({
      status: "pending",
      last_error: null,
      locked_by: null,
      locked_at: null,
      scheduled_at: new Date().toISOString(),
    })
    .in("id", resumableQueueIds);
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const invocationId = `vercel-${Date.now()}`;

  await recoverPrematureFailures(supabase);

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
        .select("*, email_accounts(*), campaigns(status, sender_profiles(from_name, reply_to, daily_limit))")
        .eq("id", queueRow.email_send_id)
        .single();

      if (!emailSend) {
        await supabase
          .from("email_send_queue")
          .update({ status: "failed", last_error: "Email send record not found", locked_by: null, locked_at: null })
          .eq("id", queueRow.id);
        continue;
      }

      if (emailSend.status === "pending_gen") {
        await supabase
          .from("email_send_queue")
          .update({
            status: "pending",
            last_error: "Waiting for email content generation",
            locked_by: null,
            locked_at: null,
            scheduled_at: queueDelay(30),
          })
          .eq("id", queueRow.id);
        continue;
      }

      if (emailSend.status !== "ready") {
        await supabase
          .from("email_send_queue")
          .update({
            status: emailSend.status === "sent" ? "sent" : "failed",
            last_error: emailSend.status === "sent" ? null : `Email send is ${emailSend.status}`,
            locked_by: null,
            locked_at: null,
          })
          .eq("id", queueRow.id);
        continue;
      }

      if (!emailSend.subject || !emailSend.body_html) {
        await supabase
          .from("email_send_queue")
          .update({
            status: "pending",
            last_error: "Generated email content is incomplete",
            locked_by: null,
            locked_at: null,
            scheduled_at: queueDelay(60),
          })
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

      const campaign = emailSend.campaigns as unknown as {
        status: string;
        sender_profiles: { from_name: string; reply_to: string | null; daily_limit: number }
      } | null;
      const profile = campaign?.sender_profiles;

      if (campaign?.status !== "active") {
        await supabase
          .from("email_send_queue")
          .update({
            status: "pending",
            last_error: "Campaign is not active",
            locked_by: null,
            locked_at: null,
            scheduled_at: queueDelay(300),
          })
          .eq("id", queueRow.id);
        continue;
      }

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
      const retryCount = (queueRow.retry_count ?? 0) + 1;
      const shouldRetry = retryCount < 3;

      await supabase
        .from("email_send_queue")
        .update({
          status: shouldRetry ? "pending" : "failed",
          last_error: String(err),
          retry_count: retryCount,
          locked_by: null,
          locked_at: null,
          ...(shouldRetry ? { scheduled_at: queueDelay(60 * retryCount) } : {}),
        })
        .eq("id", queueRow.id);

      if (!shouldRetry) {
        await supabase
          .from("email_sends")
          .update({ status: "failed", error_message: String(err) })
          .eq("id", queueRow.email_send_id);
      }
    }
  }

  return NextResponse.json({ sent });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
