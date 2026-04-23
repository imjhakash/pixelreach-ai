import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  const serviceSupabase = getServiceClient();

  await serviceSupabase
    .from("campaigns")
    .update({ status, ...(status === "active" ? { started_at: new Date().toISOString() } : {}) })
    .eq("id", id)
    .eq("user_id", user.id);

  if (status === "active") {
    const { data: campaign } = await serviceSupabase
      .from("campaigns")
      .select("*, sender_profiles(daily_limit, delay_seconds)")
      .eq("id", id)
      .single();

    if (campaign) {
      const delaySeconds = campaign.sender_profiles?.delay_seconds ?? 60;

      const { data: leads } = await serviceSupabase
        .from("leads")
        .select("id")
        .eq("list_id", campaign.lead_list_id)
        .eq("status", "new");

      if (leads && leads.length > 0) {
        const { data: accounts } = await serviceSupabase
          .from("email_accounts")
          .select("id, rotation_order")
          .eq("sender_profile_id", campaign.sender_profile_id)
          .eq("is_active", true)
          .order("rotation_order");

        const emailSends = leads.map((lead, i) => ({
          campaign_id: id,
          lead_id: lead.id,
          email_account_id: accounts && accounts.length > 0
            ? accounts[i % accounts.length].id
            : null,
          status: "pending_gen",
        }));

        const CHUNK = 100;
        for (let i = 0; i < emailSends.length; i += CHUNK) {
          const { data: inserted } = await serviceSupabase
            .from("email_sends")
            .insert(emailSends.slice(i, i + CHUNK))
            .select("id");

          if (inserted) {
            const queueRows = inserted.map((s: { id: string }, j: number) => ({
              email_send_id: s.id,
              scheduled_at: new Date(Date.now() + (i + j) * delaySeconds * 1000).toISOString(),
              status: "pending",
            }));
            await serviceSupabase.from("email_send_queue").insert(queueRows);
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
