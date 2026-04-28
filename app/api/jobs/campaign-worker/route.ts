/**
 * Campaign Worker — single self-contained cron handler.
 *
 * Designed for Vercel Hobby (10 s function timeout):
 *   1. Unlock any queue rows stuck in "processing" > 2 min
 *   2. Generate AI content for the next pending email that is due
 *   3. Send 1 ready email
 *   4. Schedule any due follow-up emails
 *
 * No HTTP sub-calls — everything runs inline so the function
 * completes in ~4–8 s.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateEmailContent, getProfileSignaturesFromUser } from "@/lib/prompt-studio";
import { decrypt } from "@/lib/encrypt";
import nodemailer from "nodemailer";

/** Node runtime + generous cap so SMTP + OpenRouter finish under load (Pro tier uses full limit). */
export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function verifyCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Supabase = Awaited<ReturnType<typeof createServiceClient>>;

type QueueRow = {
  id: string;
  email_send_id: string;
  retry_count: number | null;
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const workerId = `w-${Date.now()}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pixelreach.ai";

  // ── 1. Release rows stuck in "processing" for > 2 min ──────────────────────
  await supabase
    .from("email_send_queue")
    .update({ status: "pending", locked_by: null, locked_at: null })
    .eq("status", "processing")
    .lt("locked_at", new Date(Date.now() - 2 * 60 * 1000).toISOString());

  // ── 2. Generate AI content for the next due pending_gen email ───────────────
  let generated = 0;
  try {
    // Find the earliest-due queue row whose email still needs generation
    const { data: dueQueue } = await supabase
      .from("email_send_queue")
      .select("email_send_id")
      .eq("status", "pending")
      .lte("scheduled_at", new Date(Date.now() + 60 * 1000).toISOString()) // 60 s lookahead
      .order("scheduled_at", { ascending: true })
      .limit(5);

    if (dueQueue && dueQueue.length > 0) {
      const sendIds = dueQueue.map((q) => q.email_send_id);

      const { data: toGenerate } = await supabase
        .from("email_sends")
        .select("id, tracking_id, campaign_id, follow_up_id, lead_id")
        .in("id", sendIds)
        .eq("status", "pending_gen")
        .limit(1);

      if (toGenerate && toGenerate.length > 0) {
        const ok = await generateOne(supabase, toGenerate[0], appUrl);
        if (ok) generated = 1;
      }
    }
  } catch (err) {
    console.error("[campaign-worker] generate step error:", err);
  }

  // ── 3. Send 1 ready email ──────────────────────────────────────────────────
  let sent = 0;
  try {
    const { data: batch } = await supabase.rpc("lock_queue_batch", {
      p_limit: 1,
      p_locked_by: workerId,
    });

    if (batch && batch.length > 0) {
      const ok = await sendOne(supabase, batch[0] as QueueRow);
      if (ok) sent = 1;
    }
  } catch (err) {
    console.error("[campaign-worker] send step error:", err);
  }

  // ── 4. Schedule due follow-up emails ──────────────────────────────────────
  let followupsScheduled = 0;
  try {
    followupsScheduled = await scheduleFollowups(supabase);
  } catch (err) {
    console.error("[campaign-worker] followup step error:", err);
  }

  return NextResponse.json({ generated, sent, followupsScheduled });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

// ─── Generate one email ──────────────────────────────────────────────────────

async function generateOne(
  supabase: Supabase,
  send: {
    id: string;
    tracking_id: string | null;
    campaign_id: string;
    follow_up_id: string | null;
    lead_id: string;
  },
  appUrl: string
): Promise<boolean> {
  const [{ data: campaign }, { data: lead }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("user_id, subject_prompt, body_prompt, sender_profiles(*)")
      .eq("id", send.campaign_id)
      .single(),
    supabase.from("leads").select("*").eq("id", send.lead_id).single(),
  ]);

  if (!campaign || !lead) return false;

  let subjectPrompt = campaign.subject_prompt;
  let bodyPrompt = campaign.body_prompt;

  if (send.follow_up_id) {
    const { data: fu } = await supabase
      .from("follow_ups")
      .select("subject_prompt, body_prompt")
      .eq("id", send.follow_up_id)
      .eq("campaign_id", send.campaign_id)
      .single();
    subjectPrompt = fu?.subject_prompt ?? subjectPrompt;
    bodyPrompt = fu?.body_prompt ?? bodyPrompt;
  }

  const senderProfiles = campaign.sender_profiles as unknown;
  const profile = Array.isArray(senderProfiles)
    ? ((senderProfiles[0] as Record<string, unknown> | undefined) ?? null)
    : (senderProfiles as Record<string, unknown> | null);
  if (!profile) return false;

  const { data: profileUser } = await supabase.auth.admin.getUserById(campaign.user_id);
  const profileWithSigs = {
    ...profile,
    email_signatures: getProfileSignaturesFromUser(
      profileUser?.user,
      String(profile.id ?? "")
    ),
  };

  const trackingId = send.tracking_id;
  const result = await generateEmailContent({
    profile: profileWithSigs as never,
    lead: lead as never,
    subjectPrompt,
    bodyPrompt,
    appUrl,
    tracking: trackingId
      ? {
          clickUrl: `${appUrl}/t/click/${trackingId}?url=ORIGINAL_URL`,
          openPixelUrl: `${appUrl}/t/open/${trackingId}`,
        }
      : undefined,
  });

  if (result?.subject && result?.body_html) {
    await supabase
      .from("email_sends")
      .update({ subject: result.subject, body_html: result.body_html, status: "ready" })
      .eq("id", send.id);
    return true;
  }
  return false;
}

// ─── Send one email ───────────────────────────────────────────────────────────

function delay(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function sendOne(supabase: Supabase, queueRow: QueueRow): Promise<boolean> {
  try {
    const { data: emailSend } = await supabase
      .from("email_sends")
      .select(
        "*, email_accounts(*), campaigns(status, sender_profiles(from_name, reply_to, daily_limit))"
      )
      .eq("id", queueRow.email_send_id)
      .single();

    if (!emailSend) {
      await supabase
        .from("email_send_queue")
        .update({ status: "failed", last_error: "Email send record not found", locked_by: null, locked_at: null })
        .eq("id", queueRow.id);
      return false;
    }

    if (emailSend.status === "pending_gen") {
      await supabase
        .from("email_send_queue")
        .update({ status: "pending", last_error: "Waiting for generation", locked_by: null, locked_at: null, scheduled_at: delay(30) })
        .eq("id", queueRow.id);
      return false;
    }

    if (emailSend.status !== "ready") {
      await supabase
        .from("email_send_queue")
        .update({
          status: emailSend.status === "sent" ? "sent" : "failed",
          last_error: emailSend.status === "sent" ? null : `Email is ${emailSend.status}`,
          locked_by: null,
          locked_at: null,
        })
        .eq("id", queueRow.id);
      return false;
    }

    if (!emailSend.subject || !emailSend.body_html) {
      await supabase
        .from("email_send_queue")
        .update({ status: "pending", last_error: "Incomplete content", locked_by: null, locked_at: null, scheduled_at: delay(60) })
        .eq("id", queueRow.id);
      return false;
    }

    const campaign = emailSend.campaigns as {
      status: string;
      sender_profiles: { from_name: string; reply_to: string | null; daily_limit: number };
    } | null;

    if (campaign?.status !== "active") {
      await supabase
        .from("email_send_queue")
        .update({ status: "pending", last_error: "Campaign not active", locked_by: null, locked_at: null, scheduled_at: delay(300) })
        .eq("id", queueRow.id);
      return false;
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
        .update({ status: "failed", last_error: "No email account linked", locked_by: null, locked_at: null })
        .eq("id", queueRow.id);
      return false;
    }

    const profile = campaign.sender_profiles;
    const today = new Date().toISOString().slice(0, 10);
    const dailySent = account.daily_reset_at === today ? account.daily_sent : 0;

    if (profile && dailySent >= profile.daily_limit) {
      await supabase
        .from("email_send_queue")
        .update({
          status: "pending",
          locked_by: null,
          locked_at: null,
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", queueRow.id);
      return false;
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("email, first_name, last_name")
      .eq("id", emailSend.lead_id)
      .single();

    if (!lead?.email) {
      await supabase
        .from("email_send_queue")
        .update({ status: "failed", last_error: "Lead has no email address", locked_by: null, locked_at: null })
        .eq("id", queueRow.id);
      return false;
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
      supabase
        .from("email_accounts")
        .update({ daily_sent: dailySent + 1, daily_reset_at: today })
        .eq("id", emailSend.email_account_id),
      supabase
        .rpc("increment_campaign_sent", { campaign_id: emailSend.campaign_id })
        .maybeSingle(),
      supabase.from("tracking_events").insert({ email_send_id: emailSend.id, event_type: "sent" }),
    ]);

    return true;
  } catch (err) {
    console.error("[campaign-worker] SMTP error:", err);
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
        ...(shouldRetry ? { scheduled_at: delay(60 * retryCount) } : {}),
      })
      .eq("id", queueRow.id);
    if (!shouldRetry) {
      await supabase
        .from("email_sends")
        .update({ status: "failed", error_message: String(err) })
        .eq("id", queueRow.email_send_id);
    }
    return false;
  }
}

// ─── Schedule follow-ups ──────────────────────────────────────────────────────

async function scheduleFollowups(supabase: Supabase): Promise<number> {
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, sender_profile_id")
    .eq("status", "active");

  if (!campaigns || campaigns.length === 0) return 0;

  let scheduled = 0;

  for (const campaign of campaigns) {
    const { data: followUps } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("step");

    if (!followUps || followUps.length === 0) continue;

    const { data: profile } = await supabase
      .from("sender_profiles")
      .select("delay_seconds")
      .eq("id", campaign.sender_profile_id)
      .single();

    const delaySeconds = profile?.delay_seconds ?? 60;

    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("id, rotation_order")
      .eq("sender_profile_id", campaign.sender_profile_id)
      .eq("is_active", true)
      .order("rotation_order");

    for (const fu of followUps) {
      const dueDate = new Date(Date.now() - fu.delay_days * 24 * 60 * 60 * 1000);

      const { data: sentAtStep } = await supabase
        .from("email_sends")
        .select("id, lead_id")
        .eq("campaign_id", campaign.id)
        .is("follow_up_id", null)
        .eq("status", "sent")
        .lt("sent_at", dueDate.toISOString())
        .limit(20); // process in small batches

      if (!sentAtStep || sentAtStep.length === 0) continue;

      for (const [i, original] of sentAtStep.entries()) {
        const { count: alreadySent } = await supabase
          .from("email_sends")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("follow_up_id", fu.id)
          .eq("lead_id", original.lead_id);

        if (alreadySent && alreadySent > 0) continue;

        const { count: replied } = await supabase
          .from("email_sends")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("lead_id", original.lead_id)
          .not("replied_at", "is", null);

        if (replied && replied > 0) continue;

        const { data: newSend } = await supabase
          .from("email_sends")
          .insert({
            campaign_id: campaign.id,
            follow_up_id: fu.id,
            lead_id: original.lead_id,
            email_account_id:
              accounts && accounts.length > 0
                ? accounts[i % accounts.length].id
                : null,
            status: "pending_gen",
          })
          .select("id")
          .single();

        if (newSend) {
          await supabase.from("email_send_queue").insert({
            email_send_id: newSend.id,
            scheduled_at: new Date(Date.now() + i * delaySeconds * 1000).toISOString(),
            status: "pending",
          });
          scheduled++;
        }
      }
    }
  }

  return scheduled;
}
