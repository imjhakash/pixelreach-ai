import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

const CAMPAIGN_STATUSES = new Set(["draft", "active", "paused", "completed"]);
const CHUNK_SIZE = 100;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (typeof status !== "string" || !CAMPAIGN_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid campaign status" }, { status: 400 });
  }

  const serviceSupabase = getServiceClient();

  const { data: campaign, error: campaignError } = await serviceSupabase
    .from("campaigns")
    .select("*, sender_profiles(delay_seconds)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { error: updateError } = await serviceSupabase
    .from("campaigns")
    .update({ status, ...(status === "active" ? { started_at: new Date().toISOString() } : {}) })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === "active") {
    const delaySeconds = campaign.sender_profiles?.delay_seconds ?? 60;

    const { data: accounts } = await serviceSupabase
      .from("email_accounts")
      .select("id, rotation_order")
      .eq("sender_profile_id", campaign.sender_profile_id)
      .eq("is_active", true)
      .order("rotation_order");

    if (!accounts || accounts.length === 0) {
      await serviceSupabase.from("campaigns").update({ status: campaign.status }).eq("id", id);
      return NextResponse.json(
        { error: "Add at least one active email account before starting this campaign." },
        { status: 400 }
      );
    }

    const [{ data: leads }, { data: existingSends }] = await Promise.all([
      serviceSupabase
        .from("leads")
        .select("id")
        .eq("list_id", campaign.lead_list_id)
        .eq("status", "new"),
      serviceSupabase
        .from("email_sends")
        .select("id, lead_id, status")
        .eq("campaign_id", id)
        .is("follow_up_id", null),
    ]);

    const existingLeadIds = new Set((existingSends ?? []).map((send) => send.lead_id));
    const unsentLeads = (leads ?? []).filter((lead) => !existingLeadIds.has(lead.id));

    for (let i = 0; i < unsentLeads.length; i += CHUNK_SIZE) {
      const emailSends = unsentLeads.slice(i, i + CHUNK_SIZE).map((lead, j) => ({
        campaign_id: id,
        lead_id: lead.id,
        email_account_id: accounts[(i + j) % accounts.length].id,
        status: "pending_gen",
      }));

      const { data: inserted, error: insertError } = await serviceSupabase
        .from("email_sends")
        .insert(emailSends)
        .select("id");

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      if (inserted && inserted.length > 0) {
        const queueRows = inserted.map((send: { id: string }, j: number) => ({
          email_send_id: send.id,
          scheduled_at: new Date(Date.now() + (i + j) * delaySeconds * 1000).toISOString(),
          status: "pending",
        }));
        const { error: queueError } = await serviceSupabase.from("email_send_queue").insert(queueRows);
        if (queueError) {
          return NextResponse.json({ error: queueError.message }, { status: 500 });
        }
      }
    }

    const resumableSendIds = (existingSends ?? [])
      .filter((send) => send.status === "pending_gen" || send.status === "ready")
      .map((send) => send.id);

    for (let i = 0; i < resumableSendIds.length; i += CHUNK_SIZE) {
      await serviceSupabase
        .from("email_send_queue")
        .update({
          status: "pending",
          last_error: null,
          locked_by: null,
          locked_at: null,
          scheduled_at: new Date().toISOString(),
        })
        .in("email_send_id", resumableSendIds.slice(i, i + CHUNK_SIZE))
        .in("status", ["failed", "processing"]);
    }
  }

  return NextResponse.json({ ok: true });
}
