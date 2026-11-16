import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/providerOAuth";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const { provider } = await request.json();
    if (!['google', 'microsoft'].includes(provider)) return NextResponse.json({ error: "Choose Google or Microsoft." }, { status: 400 });
    const admin = serviceClient();
    const { error } = await admin.from("provider_connections").delete().eq("user_id", user.id).eq("provider", provider);
    if (error) throw error;
    return NextResponse.json({ disconnected: provider });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
}
