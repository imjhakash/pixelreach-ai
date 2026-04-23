import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getServiceClient, getUserFromRequest } from "@/lib/supabase/api-client";
import { decrypt } from "@/lib/encrypt";
import { generateEmailContent, resolvePromptDefaults } from "@/lib/prompt-studio";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { leadId, profileId, accountId } = await req.json();
    if (!leadId || !profileId || !accountId) {
      return NextResponse.json(
        { error: "Lead, sender profile, and email account are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const [{ data: lead }, { data: profile }, { data: account }, { data: promptSettings }] =
      await Promise.all([
        supabase.from("leads").select("*").eq("id", leadId).eq("user_id", user.id).single(),
        supabase
          .from("sender_profiles")
          .select("*")
          .eq("id", profileId)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("email_accounts")
          .select("*")
          .eq("id", accountId)
          .eq("sender_profile_id", profileId)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("prompt_studio_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (!profile) return NextResponse.json({ error: "Sender profile not found" }, { status: 404 });
    if (!account) return NextResponse.json({ error: "Email account not found" }, { status: 404 });

    const promptDefaults = resolvePromptDefaults(promptSettings ?? null);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pixelreach.ai";
    const generated = await generateEmailContent({
      profile,
      lead,
      subjectPrompt: promptDefaults.subjectPrompt,
      bodyPrompt: promptDefaults.bodyPrompt,
      appUrl,
    });

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_port === 465,
      auth: {
        user: account.smtp_user,
        pass: decrypt(account.smtp_pass_encrypted),
      },
    });

    await transporter.sendMail({
      from: `"${profile.from_name}" <${account.from_email}>`,
      to: lead.email,
      replyTo: profile.reply_to ?? undefined,
      subject: generated.subject,
      html: generated.body_html,
      headers: {
        "X-PixelReach-Test-Send": "true",
      },
    });

    return NextResponse.json({
      ok: true,
      sent_to: lead.email,
      subject: generated.subject,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
