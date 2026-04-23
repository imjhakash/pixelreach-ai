import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function syncListLeadCount(supabase: ReturnType<typeof getServiceClient>, listId: string, userId: string) {
  const { count, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId)
    .eq("user_id", userId);

  if (countError) throw countError;

  const { error: updateError } = await supabase
    .from("lead_lists")
    .update({ total_leads: count ?? 0 })
    .eq("id", listId)
    .eq("user_id", userId);

  if (updateError) throw updateError;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceClient();
    const { data: list, error: listError } = await supabase
      .from("lead_lists")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: "Lead list not found" }, { status: 404 });
    }

    const body = await req.json();
    const customFields = Object.fromEntries(
      Object.entries((body.custom_fields ?? {}) as Record<string, unknown>)
        .map(([key, value]) => [clean(key), clean(value)])
        .filter(([key, value]) => key && value)
    );

    const email = clean(body.email);
    if (!email) {
      return NextResponse.json({ error: "Lead email is required" }, { status: 400 });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,
        list_id: id,
        first_name: clean(body.first_name) || null,
        last_name: clean(body.last_name) || null,
        email,
        phone: clean(body.phone) || null,
        company: clean(body.company) || null,
        job_title: clean(body.job_title) || null,
        location: clean(body.location) || null,
        linkedin_url: clean(body.linkedin_url) || null,
        website: clean(body.website) || null,
        notes: clean(body.notes) || null,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
        status: "new",
      })
      .select()
      .single();

    if (error) throw error;

    await syncListLeadCount(supabase, id, user.id);

    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("lead_lists")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete list" },
      { status: 500 }
    );
  }
}
