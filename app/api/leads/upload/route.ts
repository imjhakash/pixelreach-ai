import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { listName, locationTag, leads } = await req.json();
    const userId = user.id;

    if (!listName || !leads?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: list, error: listError } = await supabase
      .from("lead_lists")
      .insert({
        user_id: userId,
        name: listName,
        location_tag: locationTag || null,
        total_leads: leads.length,
      })
      .select()
      .single();

    if (listError) throw listError;

    const CHUNK_SIZE = 100;
    for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
      const chunk = leads.slice(i, i + CHUNK_SIZE).map((lead: Record<string, string>) => ({
        user_id: userId,
        list_id: list.id,
        first_name: lead.first_name || lead.firstname || null,
        last_name: lead.last_name || lead.lastname || null,
        email: lead.email || "",
        phone: lead.phone || lead.telephone || lead.mobile || null,
        company: lead.company || lead.organization || null,
        job_title: lead.job_title || lead.title || lead.role || null,
        location: lead.location || lead.city || lead.country || null,
        linkedin_url: lead.linkedin_url || lead.linkedin || null,
        website: lead.website || lead.url || null,
        notes: lead.notes || null,
        status: "new",
      })).filter((l: { email: string }) => l.email);

      const { error } = await supabase.from("leads").insert(chunk);
      if (error) throw error;
    }

    return NextResponse.json({ list });
  } catch (err) {
    console.error("leads/upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
