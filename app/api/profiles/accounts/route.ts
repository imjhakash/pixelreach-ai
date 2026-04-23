import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";
import { encrypt } from "@/lib/encrypt";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceClient();

    const body = await req.json();
    const {
      profileId, label, from_email,
      smtp_host, smtp_port, smtp_user, smtp_pass,
      imap_host, imap_port, imap_user, imap_pass, imap_enabled,
    } = body;

    const { count } = await supabase
      .from("email_accounts")
      .select("id", { count: "exact", head: true })
      .eq("sender_profile_id", profileId);

    const { data: account, error } = await supabase
      .from("email_accounts")
      .insert({
        user_id: user.id,
        sender_profile_id: profileId,
        label,
        from_email,
        smtp_host,
        smtp_port: smtp_port ?? 587,
        smtp_user,
        smtp_pass_encrypted: encrypt(smtp_pass),
        imap_host: imap_host || null,
        imap_port: imap_port ?? 993,
        imap_user: imap_user || null,
        imap_pass_encrypted: imap_pass ? encrypt(imap_pass) : null,
        imap_enabled: !!imap_enabled,
        rotation_order: count ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ account });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
