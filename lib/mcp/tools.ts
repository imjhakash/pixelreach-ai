import { z } from "zod";
import nodemailer from "nodemailer";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getServiceClient } from "@/lib/supabase/api-client";
import { encrypt, decrypt } from "@/lib/encrypt";
import type { McpAuthContext } from "./auth";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function ok(payload: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

function getAuth(extra: { authInfo?: { extra?: unknown } } | undefined): McpAuthContext {
  const ctx = extra?.authInfo?.extra as McpAuthContext | undefined;
  if (!ctx?.userId) throw new Error("Missing auth context");
  return ctx;
}

const SAFE_LEAD_FIELDS =
  "id, list_id, first_name, last_name, email, phone, company, job_title, location, linkedin_url, website, notes, custom_fields, status, created_at";

export function registerTools(server: McpServer) {
  // ─────────────── Lead Lists ───────────────
  server.registerTool(
    "list_lead_lists",
    {
      title: "List lead lists",
      description: "Get all lead lists for the authenticated user.",
      inputSchema: { limit: z.number().int().min(1).max(200).default(50).optional() },
    },
    async ({ limit }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("lead_lists")
        .select("id, name, location_tag, total_leads, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit ?? 50);
      if (error) return fail(error.message);
      return ok({ lists: data });
    }
  );

  server.registerTool(
    "get_lead_list",
    {
      title: "Get lead list",
      description: "Fetch one lead list by id, including stats.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("lead_lists")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return fail(error.message);
      if (!data) return fail("Not found");
      return ok({ list: data });
    }
  );

  server.registerTool(
    "create_lead_list",
    {
      title: "Create lead list",
      description: "Create a new lead list (folder) to group leads.",
      inputSchema: {
        name: z.string().min(1),
        location_tag: z.string().optional(),
        description: z.string().optional(),
      },
    },
    async ({ name, location_tag, description }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("lead_lists")
        .insert({ user_id: userId, name, location_tag: location_tag ?? null, description: description ?? null })
        .select()
        .single();
      if (error) return fail(error.message);
      return ok({ list: data });
    }
  );

  server.registerTool(
    "delete_lead_list",
    {
      title: "Delete lead list",
      description: "Delete a lead list. Leads in this list are detached, not deleted.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { error } = await sb.from("lead_lists").delete().eq("id", id).eq("user_id", userId);
      if (error) return fail(error.message);
      return ok({ deleted: id });
    }
  );

  // ─────────────── Leads ───────────────
  server.registerTool(
    "search_leads",
    {
      title: "Search leads",
      description:
        "Search leads by free-text query (matches email, name, company, job title, location). Optionally filter by list_id and status.",
      inputSchema: {
        query: z.string().optional(),
        list_id: z.string().uuid().optional(),
        status: z.enum(["new", "emailed", "replied", "bounced", "unsubscribed"]).optional(),
        limit: z.number().int().min(1).max(200).default(50).optional(),
      },
    },
    async ({ query, list_id, status, limit }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      let q = sb.from("leads").select(SAFE_LEAD_FIELDS).eq("user_id", userId);
      if (list_id) q = q.eq("list_id", list_id);
      if (status) q = q.eq("status", status);
      if (query && query.trim()) {
        const term = `%${query.trim()}%`;
        q = q.or(
          `email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},company.ilike.${term},job_title.ilike.${term},location.ilike.${term}`
        );
      }
      const { data, error } = await q.order("created_at", { ascending: false }).limit(limit ?? 50);
      if (error) return fail(error.message);
      return ok({ leads: data, count: data?.length ?? 0 });
    }
  );

  server.registerTool(
    "get_lead",
    {
      title: "Get lead",
      description: "Fetch one lead by id.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("leads")
        .select(SAFE_LEAD_FIELDS)
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return fail(error.message);
      if (!data) return fail("Not found");
      return ok({ lead: data });
    }
  );

  server.registerTool(
    "create_lead",
    {
      title: "Create lead",
      description: "Add a single lead to a list.",
      inputSchema: {
        list_id: z.string().uuid(),
        email: z.string().email(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        job_title: z.string().optional(),
        location: z.string().optional(),
        linkedin_url: z.string().url().optional(),
        website: z.string().url().optional(),
        notes: z.string().optional(),
        custom_fields: z.record(z.string(), z.string()).optional(),
      },
    },
    async (input, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data: list } = await sb
        .from("lead_lists")
        .select("id")
        .eq("id", input.list_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!list) return fail("Lead list not found");

      const { data, error } = await sb
        .from("leads")
        .insert({
          user_id: userId,
          list_id: input.list_id,
          email: input.email,
          first_name: input.first_name ?? null,
          last_name: input.last_name ?? null,
          phone: input.phone ?? null,
          company: input.company ?? null,
          job_title: input.job_title ?? null,
          location: input.location ?? null,
          linkedin_url: input.linkedin_url ?? null,
          website: input.website ?? null,
          notes: input.notes ?? null,
          custom_fields: input.custom_fields ?? null,
          status: "new",
        })
        .select(SAFE_LEAD_FIELDS)
        .single();
      if (error) return fail(error.message);

      const { count } = await sb
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("list_id", input.list_id)
        .eq("user_id", userId);
      await sb.from("lead_lists").update({ total_leads: count ?? 0 }).eq("id", input.list_id);

      return ok({ lead: data });
    }
  );

  server.registerTool(
    "update_lead",
    {
      title: "Update lead",
      description: "Patch fields on an existing lead.",
      inputSchema: {
        id: z.string().uuid(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        email: z.string().email().optional(),
        phone: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        job_title: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        linkedin_url: z.string().url().nullable().optional(),
        website: z.string().url().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.enum(["new", "emailed", "replied", "bounced", "unsubscribed"]).optional(),
      },
    },
    async ({ id, ...patch }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("leads")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId)
        .select(SAFE_LEAD_FIELDS)
        .maybeSingle();
      if (error) return fail(error.message);
      if (!data) return fail("Not found");
      return ok({ lead: data });
    }
  );

  server.registerTool(
    "delete_lead",
    {
      title: "Delete lead",
      description: "Remove a lead by id.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { error } = await sb.from("leads").delete().eq("id", id).eq("user_id", userId);
      if (error) return fail(error.message);
      return ok({ deleted: id });
    }
  );

  // ─────────────── Sender Profiles ───────────────
  server.registerTool(
    "list_sender_profiles",
    {
      title: "List sender profiles",
      description: "Return all sender (company) profiles. Secrets are redacted.",
      inputSchema: {},
    },
    async (_args, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("sender_profiles")
        .select(
          "id, company_name, company_address, services, portfolio_url, details, from_name, reply_to, daily_limit, delay_seconds, openrouter_model, openrouter_fallback_model, openrouter_temperature, openrouter_max_tokens, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return fail(error.message);
      return ok({ profiles: data });
    }
  );

  server.registerTool(
    "get_sender_profile",
    {
      title: "Get sender profile",
      description: "Fetch one sender profile by id (secrets redacted).",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("sender_profiles")
        .select(
          "id, company_name, company_address, services, portfolio_url, details, from_name, reply_to, daily_limit, delay_seconds, openrouter_model, openrouter_fallback_model, openrouter_temperature, openrouter_max_tokens, created_at"
        )
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return fail(error.message);
      if (!data) return fail("Not found");
      return ok({ profile: data });
    }
  );

  server.registerTool(
    "create_sender_profile",
    {
      title: "Create sender profile",
      description:
        "Create a new sender profile (company card used for outbound emails). Pass openrouter_api_key to set the AI key (it will be encrypted at rest).",
      inputSchema: {
        company_name: z.string().min(1),
        from_name: z.string().min(1),
        company_address: z.string().optional(),
        services: z.string().optional(),
        portfolio_url: z.string().url().optional(),
        details: z.string().optional(),
        reply_to: z.string().email().optional(),
        daily_limit: z.number().int().min(1).max(2000).optional(),
        delay_seconds: z.number().int().min(0).max(3600).optional(),
        openrouter_api_key: z.string().optional(),
        openrouter_model: z.string().optional(),
        openrouter_fallback_model: z.string().optional(),
        openrouter_temperature: z.number().min(0).max(2).optional(),
        openrouter_max_tokens: z.number().int().min(1).max(8000).optional(),
      },
    },
    async (input, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("sender_profiles")
        .insert({
          user_id: userId,
          company_name: input.company_name,
          from_name: input.from_name,
          company_address: input.company_address ?? null,
          services: input.services ?? null,
          portfolio_url: input.portfolio_url ?? null,
          details: input.details ?? null,
          reply_to: input.reply_to ?? null,
          daily_limit: input.daily_limit ?? 50,
          delay_seconds: input.delay_seconds ?? 60,
          openrouter_api_key_encrypted: input.openrouter_api_key
            ? encrypt(input.openrouter_api_key)
            : null,
          openrouter_model: input.openrouter_model ?? "anthropic/claude-sonnet-4",
          openrouter_fallback_model: input.openrouter_fallback_model ?? "openai/gpt-4o-mini",
          openrouter_temperature: input.openrouter_temperature ?? 0.7,
          openrouter_max_tokens: input.openrouter_max_tokens ?? 600,
        })
        .select(
          "id, company_name, from_name, openrouter_model, daily_limit, delay_seconds, created_at"
        )
        .single();
      if (error) return fail(error.message);
      return ok({ profile: data });
    }
  );

  server.registerTool(
    "delete_sender_profile",
    {
      title: "Delete sender profile",
      description: "Delete a sender profile and its email accounts.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { error } = await sb
        .from("sender_profiles")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return fail(error.message);
      return ok({ deleted: id });
    }
  );

  // ─────────────── Email Accounts ───────────────
  server.registerTool(
    "list_email_accounts",
    {
      title: "List email accounts",
      description: "List SMTP/IMAP accounts attached to a sender profile (passwords redacted).",
      inputSchema: { sender_profile_id: z.string().uuid().optional() },
    },
    async ({ sender_profile_id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      let q = sb
        .from("email_accounts")
        .select(
          "id, sender_profile_id, label, from_email, smtp_host, smtp_port, smtp_user, imap_host, imap_port, imap_user, imap_enabled, is_active, daily_sent, rotation_order, created_at"
        )
        .eq("user_id", userId);
      if (sender_profile_id) q = q.eq("sender_profile_id", sender_profile_id);
      const { data, error } = await q.order("rotation_order", { ascending: true });
      if (error) return fail(error.message);
      return ok({ accounts: data });
    }
  );

  server.registerTool(
    "add_email_account",
    {
      title: "Add email account",
      description:
        "Attach an SMTP/IMAP mailbox to a sender profile. The SMTP/IMAP passwords are encrypted at rest.",
      inputSchema: {
        sender_profile_id: z.string().uuid(),
        label: z.string().min(1),
        from_email: z.string().email(),
        smtp_host: z.string().min(1),
        smtp_port: z.number().int().min(1).max(65535).default(587).optional(),
        smtp_user: z.string().min(1),
        smtp_pass: z.string().min(1),
        imap_host: z.string().optional(),
        imap_port: z.number().int().min(1).max(65535).optional(),
        imap_user: z.string().optional(),
        imap_pass: z.string().optional(),
        imap_enabled: z.boolean().optional(),
      },
    },
    async (input, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { count } = await sb
        .from("email_accounts")
        .select("id", { count: "exact", head: true })
        .eq("sender_profile_id", input.sender_profile_id);
      const { data, error } = await sb
        .from("email_accounts")
        .insert({
          user_id: userId,
          sender_profile_id: input.sender_profile_id,
          label: input.label,
          from_email: input.from_email,
          smtp_host: input.smtp_host,
          smtp_port: input.smtp_port ?? 587,
          smtp_user: input.smtp_user,
          smtp_pass_encrypted: encrypt(input.smtp_pass),
          imap_host: input.imap_host ?? null,
          imap_port: input.imap_port ?? 993,
          imap_user: input.imap_user ?? null,
          imap_pass_encrypted: input.imap_pass ? encrypt(input.imap_pass) : null,
          imap_enabled: input.imap_enabled ?? false,
          rotation_order: count ?? 0,
        })
        .select("id, label, from_email, smtp_host, smtp_port, is_active, created_at")
        .single();
      if (error) return fail(error.message);
      return ok({ account: data });
    }
  );

  server.registerTool(
    "delete_email_account",
    {
      title: "Delete email account",
      description: "Remove an SMTP/IMAP mailbox.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { error } = await sb
        .from("email_accounts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return fail(error.message);
      return ok({ deleted: id });
    }
  );

  // ─────────────── Campaigns ───────────────
  server.registerTool(
    "list_campaigns",
    {
      title: "List campaigns",
      description: "List campaigns with summary stats.",
      inputSchema: {
        status: z.enum(["draft", "active", "paused", "completed"]).optional(),
        limit: z.number().int().min(1).max(200).default(50).optional(),
      },
    },
    async ({ status, limit }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      let q = sb
        .from("campaigns")
        .select(
          "id, name, status, sender_profile_id, lead_list_id, total_leads, sent_count, open_count, click_count, bounce_count, reply_count, created_at, started_at"
        )
        .eq("user_id", userId);
      if (status) q = q.eq("status", status);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(limit ?? 50);
      if (error) return fail(error.message);
      return ok({ campaigns: data });
    }
  );

  server.registerTool(
    "get_campaign",
    {
      title: "Get campaign",
      description: "Fetch one campaign by id, including follow-up steps.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data: campaign, error } = await sb
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return fail(error.message);
      if (!campaign) return fail("Not found");
      const { data: followUps } = await sb
        .from("follow_ups")
        .select("*")
        .eq("campaign_id", id)
        .order("step", { ascending: true });
      return ok({ campaign, follow_ups: followUps ?? [] });
    }
  );

  server.registerTool(
    "create_campaign",
    {
      title: "Create campaign",
      description:
        "Create a new draft campaign. Use start_campaign afterwards to activate it. Follow-up steps optional.",
      inputSchema: {
        name: z.string().min(1),
        sender_profile_id: z.string().uuid(),
        lead_list_id: z.string().uuid(),
        subject_prompt: z.string().min(1),
        body_prompt: z.string().min(1),
        follow_ups: z
          .array(
            z.object({
              step: z.number().int().min(1).max(10),
              delay_days: z.number().int().min(0).max(60),
              subject_prompt: z.string().min(1),
              body_prompt: z.string().min(1),
            })
          )
          .optional(),
      },
    },
    async (input, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { count: leadCount } = await sb
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("list_id", input.lead_list_id)
        .eq("status", "new");
      const { data: campaign, error } = await sb
        .from("campaigns")
        .insert({
          user_id: userId,
          sender_profile_id: input.sender_profile_id,
          lead_list_id: input.lead_list_id,
          name: input.name,
          subject_prompt: input.subject_prompt,
          body_prompt: input.body_prompt,
          total_leads: leadCount ?? 0,
          status: "draft",
        })
        .select()
        .single();
      if (error) return fail(error.message);
      if (input.follow_ups?.length) {
        const rows = input.follow_ups.map((fu) => ({
          campaign_id: campaign.id,
          step: fu.step,
          delay_days: fu.delay_days,
          subject_prompt: fu.subject_prompt,
          body_prompt: fu.body_prompt,
        }));
        await sb.from("follow_ups").insert(rows);
      }
      return ok({ campaign });
    }
  );

  server.registerTool(
    "set_campaign_status",
    {
      title: "Set campaign status",
      description: "Change a campaign's status (draft → active to start, active → paused to pause).",
      inputSchema: {
        id: z.string().uuid(),
        status: z.enum(["draft", "active", "paused", "completed"]),
      },
    },
    async ({ id, status }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const update: Record<string, unknown> = { status };
      if (status === "active") update.started_at = new Date().toISOString();
      const { data, error } = await sb
        .from("campaigns")
        .update(update)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id, name, status, started_at")
        .maybeSingle();
      if (error) return fail(error.message);
      if (!data) return fail("Not found");
      return ok({ campaign: data });
    }
  );

  server.registerTool(
    "delete_campaign",
    {
      title: "Delete campaign",
      description: "Delete a campaign and all its follow-ups + email send records.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { error } = await sb.from("campaigns").delete().eq("id", id).eq("user_id", userId);
      if (error) return fail(error.message);
      return ok({ deleted: id });
    }
  );

  server.registerTool(
    "get_campaign_stats",
    {
      title: "Get campaign stats",
      description: "Aggregate stats (sent / open / click / bounce / reply) for a campaign.",
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("campaigns")
        .select(
          "id, name, status, total_leads, sent_count, open_count, click_count, bounce_count, reply_count, started_at"
        )
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return fail(error.message);
      if (!data) return fail("Not found");
      const sent = data.sent_count ?? 0;
      const stats = {
        ...data,
        open_rate: sent > 0 ? (data.open_count ?? 0) / sent : 0,
        click_rate: sent > 0 ? (data.click_count ?? 0) / sent : 0,
        bounce_rate: sent > 0 ? (data.bounce_count ?? 0) / sent : 0,
        reply_rate: sent > 0 ? (data.reply_count ?? 0) / sent : 0,
      };
      return ok({ stats });
    }
  );

  // ─────────────── Email Sends ───────────────
  server.registerTool(
    "list_email_sends",
    {
      title: "List email sends",
      description:
        "List individual email send records for a campaign (most recent first). Useful for debugging deliverability.",
      inputSchema: {
        campaign_id: z.string().uuid(),
        status: z
          .enum(["pending_gen", "ready", "sent", "failed", "bounced"])
          .optional(),
        limit: z.number().int().min(1).max(200).default(50).optional(),
      },
    },
    async ({ campaign_id, status, limit }, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data: campaign } = await sb
        .from("campaigns")
        .select("id")
        .eq("id", campaign_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!campaign) return fail("Campaign not found");
      let q = sb
        .from("email_sends")
        .select(
          "id, lead_id, follow_up_id, subject, status, sent_at, opened_at, clicked_at, replied_at, error_message, created_at"
        )
        .eq("campaign_id", campaign_id);
      if (status) q = q.eq("status", status);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(limit ?? 50);
      if (error) return fail(error.message);
      return ok({ sends: data });
    }
  );

  // ─────────────── Send Email ───────────────
  server.registerTool(
    "send_email",
    {
      title: "Send email",
      description:
        "Send a one-off email to a lead via a configured email account. Subject and HTML body are provided directly (compose them yourself). The lead's status is set to 'emailed' on success.",
      inputSchema: {
        lead_id: z.string().uuid(),
        email_account_id: z.string().uuid(),
        subject: z.string().min(1),
        body_html: z.string().min(1),
        body_text: z.string().optional(),
        reply_to: z.string().email().optional(),
      },
    },
    async (input, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const [{ data: lead }, { data: account }] = await Promise.all([
        sb.from("leads").select("*").eq("id", input.lead_id).eq("user_id", userId).maybeSingle(),
        sb
          .from("email_accounts")
          .select("*")
          .eq("id", input.email_account_id)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (!lead) return fail("Lead not found");
      if (!account) return fail("Email account not found");

      const { data: profile } = await sb
        .from("sender_profiles")
        .select("from_name, reply_to")
        .eq("id", account.sender_profile_id)
        .eq("user_id", userId)
        .maybeSingle();

      try {
        const transporter = nodemailer.createTransport({
          host: account.smtp_host,
          port: account.smtp_port,
          secure: account.smtp_port === 465,
          auth: { user: account.smtp_user, pass: decrypt(account.smtp_pass_encrypted) },
        });
        await transporter.sendMail({
          from: profile?.from_name
            ? `"${profile.from_name}" <${account.from_email}>`
            : account.from_email,
          to: lead.email,
          replyTo: input.reply_to ?? profile?.reply_to ?? undefined,
          subject: input.subject,
          html: input.body_html,
          text: input.body_text,
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "SMTP send failed");
      }

      await sb.from("leads").update({ status: "emailed" }).eq("id", lead.id);
      return ok({ ok: true, sent_to: lead.email, subject: input.subject });
    }
  );

  // ─────────────── Analytics ───────────────
  server.registerTool(
    "get_dashboard_stats",
    {
      title: "Get dashboard stats",
      description:
        "Aggregate stats across all the user's campaigns: total sent / open / click / bounce / reply.",
      inputSchema: {},
    },
    async (_args, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("campaigns")
        .select("sent_count, open_count, click_count, bounce_count, reply_count")
        .eq("user_id", userId);
      if (error) return fail(error.message);
      const totals = (data ?? []).reduce(
        (acc, c) => {
          acc.total_sent += c.sent_count ?? 0;
          acc.total_opened += c.open_count ?? 0;
          acc.total_clicked += c.click_count ?? 0;
          acc.total_bounced += c.bounce_count ?? 0;
          acc.total_replied += c.reply_count ?? 0;
          return acc;
        },
        { total_sent: 0, total_opened: 0, total_clicked: 0, total_bounced: 0, total_replied: 0 }
      );
      const sent = totals.total_sent || 1;
      return ok({
        ...totals,
        open_rate: totals.total_opened / sent,
        click_rate: totals.total_clicked / sent,
        bounce_rate: totals.total_bounced / sent,
        reply_rate: totals.total_replied / sent,
      });
    }
  );

  // ─────────────── Prompt Studio ───────────────
  server.registerTool(
    "get_prompt_studio_settings",
    {
      title: "Get prompt studio settings",
      description: "Read the user's saved subject + body prompt templates.",
      inputSchema: {},
    },
    async (_args, extra) => {
      const { userId } = getAuth(extra);
      const sb = getServiceClient();
      const { data, error } = await sb
        .from("prompt_studio_settings")
        .select("subject_prompt, body_prompt, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return fail(error.message);
      return ok({ settings: data ?? null });
    }
  );
}
