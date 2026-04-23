import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encrypt";
import OpenAI from "openai";

function verifyCron(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: pendingSends } = await supabase
    .from("email_sends")
    .select("id, campaign_id, lead_id")
    .eq("status", "pending_gen")
    .limit(10);

  if (!pendingSends || pendingSends.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  let generated = 0;

  for (const send of pendingSends) {
    try {
      const [{ data: campaign }, { data: lead }] = await Promise.all([
        supabase
          .from("campaigns")
          .select("subject_prompt, body_prompt, sender_profiles(*)")
          .eq("id", send.campaign_id)
          .single(),
        supabase
          .from("leads")
          .select("*")
          .eq("id", send.lead_id)
          .single(),
      ]);

      if (!campaign || !lead) continue;

      const profile = campaign.sender_profiles as unknown as {
        company_name: string;
        services: string | null;
        details: string | null;
        portfolio_url: string | null;
        from_name: string;
        openrouter_api_key_encrypted: string | null;
        openrouter_model: string;
        openrouter_fallback_model: string | null;
        openrouter_temperature: number;
        openrouter_max_tokens: number;
      };

      if (!profile?.openrouter_api_key_encrypted) {
        await supabase
          .from("email_sends")
          .update({ status: "failed", error_message: "No OpenRouter API key configured" })
          .eq("id", send.id);
        continue;
      }

      const apiKey = decrypt(profile.openrouter_api_key_encrypted);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pixelreach.ai";

      const systemPrompt = `You are an expert cold email copywriter for ${profile.company_name}.
Company info:
- Services: ${profile.services ?? "Web design & development"}
- Portfolio: ${profile.portfolio_url ?? "N/A"}
- Details: ${profile.details ?? ""}
- From: ${profile.from_name}

Write highly personalized, engaging cold emails that feel human and avoid spam triggers.
Respond ONLY with valid JSON: {"subject": "...", "body_html": "..."}
The body_html should be clean HTML with proper paragraphs. Include a tracking-ready CTA link.`;

      const leadContext = `Lead details:
- Name: ${[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "there"}
- Company: ${lead.company ?? "their company"}
- Job Title: ${lead.job_title ?? ""}
- Location: ${lead.location ?? ""}
- LinkedIn: ${lead.linkedin_url ?? ""}
- Website: ${lead.website ?? ""}

Subject prompt: ${campaign.subject_prompt}
Body prompt: ${campaign.body_prompt}

Important: Replace any link in the email body with a tracked URL in this format:
${appUrl}/t/click/${send.id}?url=ORIGINAL_URL
Also append this invisible tracking pixel before </body>:
<img src="${appUrl}/t/open/${send.id}" width="1" height="1" style="display:none" />`;

      let result: { subject: string; body_html: string } | null = null;

      for (const model of [profile.openrouter_model, profile.openrouter_fallback_model].filter(Boolean)) {
        try {
          const client = new OpenAI({
            apiKey,
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
              "HTTP-Referer": appUrl,
              "X-Title": "PixelReach AI",
            },
          });

          const response = await client.chat.completions.create({
            model: model!,
            temperature: profile.openrouter_temperature,
            max_tokens: profile.openrouter_max_tokens,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: leadContext },
            ],
            response_format: { type: "json_object" },
          });

          const parsed = JSON.parse(response.choices[0].message.content ?? "{}");
          if (parsed.subject && parsed.body_html) {
            result = parsed;
            break;
          }
        } catch {
          continue;
        }
      }

      if (result) {
        await supabase
          .from("email_sends")
          .update({ subject: result.subject, body_html: result.body_html, status: "ready" })
          .eq("id", send.id);
        generated++;
      } else {
        await supabase
          .from("email_sends")
          .update({ status: "failed", error_message: "AI generation failed for all models" })
          .eq("id", send.id);
      }
    } catch (err) {
      console.error("generate-emails error for send", send.id, err);
      await supabase
        .from("email_sends")
        .update({ status: "failed", error_message: String(err) })
        .eq("id", send.id);
    }
  }

  return NextResponse.json({ generated });
}
