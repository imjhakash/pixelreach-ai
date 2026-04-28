import type { User } from "@supabase/supabase-js";
import OpenAI from "openai";
import { decrypt } from "@/lib/encrypt";
import type { EmailSignature, Lead, PromptStudioSettings, SenderProfile } from "@/lib/types";

export const DEFAULT_SUBJECT_PROMPT =
  "Write a short, curiosity-based cold email subject line for {{lead_name}} at {{company}}. Keep it under 8 words and avoid spammy language.";

export const DEFAULT_BODY_PROMPT =
  "Write a personalized cold email from {{sender_name}} at {{sender_company}} to {{lead_name}} at {{company}}. Mention {{job_title}} or {{location}} when useful, connect the message to their context, briefly explain how {{services}} can help, and finish with one soft CTA for a short reply or call. Keep it natural, specific, and under 170 words.";

export const PROMPT_VARIABLES = [
  { token: "{{lead_name}}", description: "Lead first and last name combined" },
  { token: "{{first_name}}", description: "Lead first name" },
  { token: "{{last_name}}", description: "Lead last name" },
  { token: "{{email}}", description: "Lead email address" },
  { token: "{{company}}", description: "Lead company name" },
  { token: "{{job_title}}", description: "Lead role or title" },
  { token: "{{location}}", description: "Lead location or market" },
  { token: "{{phone}}", description: "Lead phone number" },
  { token: "{{linkedin_url}}", description: "Lead LinkedIn URL" },
  { token: "{{website}}", description: "Lead website URL" },
  { token: "{{notes}}", description: "Lead notes" },
  { token: "{{sender_company}}", description: "Your sender profile company name" },
  { token: "{{sender_name}}", description: "Your sender profile from-name" },
  { token: "{{services}}", description: "Your services summary" },
  { token: "{{portfolio_url}}", description: "Your portfolio or website URL" },
  { token: "{{reply_to}}", description: "Your reply-to email" },
] as const;

type LeadPromptInput = Pick<
  Lead,
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "company"
  | "job_title"
  | "location"
  | "linkedin_url"
  | "website"
  | "notes"
  | "custom_fields"
>;

type ProfilePromptInput = Pick<
  SenderProfile,
  | "id"
  | "company_name"
  | "services"
  | "details"
  | "portfolio_url"
  | "from_name"
  | "reply_to"
  | "openrouter_api_key_encrypted"
  | "openrouter_model"
  | "openrouter_fallback_model"
  | "openrouter_temperature"
  | "openrouter_max_tokens"
> & {
  email_signatures?: EmailSignature[] | null;
};

type PromptSettingsLike =
  | Partial<PromptStudioSettings>
  | {
      subject_prompt?: string | null;
      body_prompt?: string | null;
    };

function cleanValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeVariableKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolvePromptDefaults(settings?: PromptSettingsLike | null) {
  return {
    subjectPrompt: cleanValue(settings?.subject_prompt) || DEFAULT_SUBJECT_PROMPT,
    bodyPrompt: cleanValue(settings?.body_prompt) || DEFAULT_BODY_PROMPT,
  };
}

export function getPromptStudioSettingsFromUser(user: Pick<User, "user_metadata"> | null | undefined) {
  const promptStudio = user?.user_metadata?.prompt_studio;
  if (!promptStudio || typeof promptStudio !== "object") return null;

  const settings = promptStudio as PromptSettingsLike;
  return {
    subject_prompt: cleanValue(settings.subject_prompt),
    body_prompt: cleanValue(settings.body_prompt),
  };
}

export function pickPromptSettings(
  primary?: PromptSettingsLike | null,
  fallback?: PromptSettingsLike | null
) {
  const resolvedPrimary = resolvePromptDefaults(primary);
  const hasPrimary =
    cleanValue(primary?.subject_prompt) !== "" || cleanValue(primary?.body_prompt) !== "";

  if (hasPrimary) {
    return resolvedPrimary;
  }

  return resolvePromptDefaults(fallback);
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function normalizeEmailSignatures(input: unknown): EmailSignature[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const signature = item as Partial<EmailSignature>;
      const html = cleanValue(signature.html);
      const plain = cleanValue(signature.plain) || stripHtml(html);
      const label = cleanValue(signature.label) || `Signature ${index + 1}`;

      if (!html && !plain) return null;

      return {
        id: cleanValue(signature.id) || `${Date.now()}-${index}`,
        label,
        html,
        plain,
        is_default: Boolean(signature.is_default),
      };
    })
    .filter((signature): signature is EmailSignature => signature !== null)
    .map((signature, index, signatures) => ({
      ...signature,
      is_default: signature.is_default || (index === 0 && !signatures.some((item) => item.is_default)),
    }));
}

export function getProfileSignaturesFromUser(
  user: Pick<User, "user_metadata"> | null | undefined,
  profileId: string
) {
  const profileSignatures = user?.user_metadata?.profile_signatures;
  if (!profileSignatures || typeof profileSignatures !== "object") return [];

  return normalizeEmailSignatures((profileSignatures as Record<string, unknown>)[profileId]);
}

export function getProfileSignaturesMapFromUser(user: Pick<User, "user_metadata"> | null | undefined) {
  const profileSignatures = user?.user_metadata?.profile_signatures;
  if (!profileSignatures || typeof profileSignatures !== "object") return {};

  return profileSignatures as Record<string, unknown>;
}

export function attachSignaturesToProfiles<T extends { id: string }>(
  profiles: T[] | null | undefined,
  user: Pick<User, "user_metadata"> | null | undefined
) {
  return (profiles ?? []).map((profile) => ({
    ...profile,
    email_signatures: getProfileSignaturesFromUser(user, profile.id),
  }));
}

function selectEmailSignature(profile: ProfilePromptInput) {
  const signatures = normalizeEmailSignatures(profile.email_signatures);
  return signatures.find((signature) => signature.is_default) ?? signatures[0] ?? null;
}

function appendEmailSignature(bodyHtml: string, signature: EmailSignature | null) {
  if (!signature) return bodyHtml;

  const htmlSignature = signature.html || signature.plain.replace(/\n/g, "<br />");
  if (!htmlSignature) return bodyHtml;

  const signatureHtml = `<div class="pixelreach-signature" style="margin-top:24px">${htmlSignature}</div>`;

  if (bodyHtml.includes("</body>")) {
    return bodyHtml.replace("</body>", `${signatureHtml}</body>`);
  }

  return `${bodyHtml}${signatureHtml}`;
}

function appendOpenPixel(bodyHtml: string, openPixelUrl?: string) {
  if (!openPixelUrl || bodyHtml.includes(openPixelUrl)) return bodyHtml;

  const pixel = `<img src="${openPixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  if (bodyHtml.includes("</body>")) {
    return bodyHtml.replace("</body>", `${pixel}</body>`);
  }

  return `${bodyHtml}${pixel}`;
}

function wrapTrackedLinks(bodyHtml: string, clickUrl?: string) {
  if (!clickUrl) return bodyHtml;

  return bodyHtml.replace(/href=(["'])(.*?)\1/gi, (match, quote: string, rawUrl: string) => {
    const url = rawUrl.trim();
    const lowerUrl = url.toLowerCase();
    if (
      !url ||
      lowerUrl.startsWith("mailto:") ||
      lowerUrl.startsWith("tel:") ||
      lowerUrl.startsWith("#") ||
      lowerUrl.includes("/t/click/")
    ) {
      return match;
    }

    const absoluteUrl = /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, "")}`;
    const trackedUrl = clickUrl.replace("ORIGINAL_URL", encodeURIComponent(absoluteUrl));
    return `href=${quote}${trackedUrl}${quote}`;
  });
}

export function buildPromptVariables(lead: LeadPromptInput, profile: ProfilePromptInput) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  const variables: Record<string, string> = {
    lead_name: fullName || "there",
    first_name: cleanValue(lead.first_name) || "there",
    last_name: cleanValue(lead.last_name),
    email: cleanValue(lead.email),
    phone: cleanValue(lead.phone),
    company: cleanValue(lead.company) || "your company",
    job_title: cleanValue(lead.job_title),
    location: cleanValue(lead.location),
    linkedin_url: cleanValue(lead.linkedin_url),
    website: cleanValue(lead.website),
    notes: cleanValue(lead.notes),
    sender_company: cleanValue(profile.company_name),
    sender_name: cleanValue(profile.from_name),
    services: cleanValue(profile.services) || "our services",
    portfolio_url: cleanValue(profile.portfolio_url),
    reply_to: cleanValue(profile.reply_to),
  };

  Object.entries(lead.custom_fields ?? {}).forEach(([rawKey, rawValue]) => {
    const normalized = normalizeVariableKey(rawKey);
    const value = cleanValue(rawValue);
    if (!normalized || !value) return;
    variables[normalized] = value;
    variables[`custom_${normalized}`] = value;
  });

  return variables;
}

export function applyPromptTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, rawToken: string) => {
    const token = normalizeVariableKey(rawToken);
    return variables[token] ?? "";
  });
}

export async function generateEmailContent({
  profile,
  lead,
  subjectPrompt,
  bodyPrompt,
  appUrl,
  tracking,
}: {
  profile: ProfilePromptInput;
  lead: LeadPromptInput;
  subjectPrompt: string;
  bodyPrompt: string;
  appUrl: string;
  tracking?: {
    clickUrl: string;
    openPixelUrl?: string;
  };
}) {
  if (!profile.openrouter_api_key_encrypted) {
    throw new Error("No OpenRouter API key configured");
  }

  const variables = buildPromptVariables(lead, profile);
  const renderedSubjectPrompt = applyPromptTemplate(subjectPrompt, variables);
  const renderedBodyPrompt = applyPromptTemplate(bodyPrompt, variables);
  const apiKey = decrypt(profile.openrouter_api_key_encrypted);

  const systemPrompt = `You are an expert cold email copywriter for ${profile.company_name}.
Company info:
- Services: ${profile.services ?? "Web design & development"}
- Portfolio: ${profile.portfolio_url ?? "N/A"}
- Details: ${profile.details ?? ""}
- From: ${profile.from_name}

Write highly personalized, engaging cold emails that feel human and avoid spam triggers.
Respond ONLY with valid JSON: {"subject": "...", "body_html": "..."}
The body_html should be clean HTML with proper paragraphs and a natural tone.`;

  const trackingInstructions = tracking
    ? `Important:
- If you include a CTA link, use this exact tracked URL in the href: ${tracking.clickUrl}
- Do not expose placeholder URLs.
${tracking.openPixelUrl ? `- Append this invisible tracking pixel before </body>: <img src="${tracking.openPixelUrl}" width="1" height="1" style="display:none" />` : ""}`
    : `Important:
- Use direct URLs only when they make sense for the email.
- Do not wrap the output in markdown or code fences.`;

  const leadContext = `Lead details:
- Name: ${variables.lead_name}
- Company: ${lead.company ?? "their company"}
- Job Title: ${lead.job_title ?? ""}
- Location: ${lead.location ?? ""}
- LinkedIn: ${lead.linkedin_url ?? ""}
- Website: ${lead.website ?? ""}
- Custom fields: ${JSON.stringify(lead.custom_fields ?? {})}

Resolved subject prompt:
${renderedSubjectPrompt}

Resolved body prompt:
${renderedBodyPrompt}

${trackingInstructions}`;

  let lastError: unknown = null;

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
        const signature = selectEmailSignature(profile);
        const bodyHtml = appendOpenPixel(
          wrapTrackedLinks(
            appendEmailSignature(String(parsed.body_html), signature),
            tracking?.clickUrl
          ),
          tracking?.openPixelUrl
        );
        const bodyText = [stripHtml(bodyHtml), signature?.plain].filter(Boolean).join("\n\n");
        return {
          subject: String(parsed.subject),
          body_html: bodyHtml,
          body_text: bodyText,
          resolvedSubjectPrompt: renderedSubjectPrompt,
          resolvedBodyPrompt: renderedBodyPrompt,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError instanceof Error ? lastError.message : "AI generation failed for all models"
  );
}
