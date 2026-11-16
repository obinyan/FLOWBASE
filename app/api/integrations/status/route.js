import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/providerOAuth";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const admin = serviceClient();
    const { data, error } = await admin.from("provider_connections").select("provider,account_email,expires_at").eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ providers: (data || []).map(({ provider, account_email, expires_at }) => ({ provider, email: account_email, expiresAt: expires_at })) });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 503 }); }
}
