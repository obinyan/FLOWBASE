import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callbackUrl, encryptTokens, providerConfig, providerEmail, serviceClient } from "@/lib/providerOAuth";

export async function GET(request, context) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const toSettings = (params = {}) => {
    const target = new URL("/settings", url.origin);
    for (const [key, value] of Object.entries(params)) if (value) target.searchParams.set(key, value);
    return NextResponse.redirect(target);
  };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const stateCookie = request.cookies.get("flowbase_provider_state")?.value;
    const userCookie = request.cookies.get("flowbase_provider_user")?.value;
    const providerCookie = request.cookies.get("flowbase_provider_name")?.value;
    const state = url.searchParams.get("state");
    if (!user || !state || state !== stateCookie || user.id !== userCookie || provider !== providerCookie) throw new Error("The calendar connection request expired. Please start again.");
    const code = url.searchParams.get("code");
    if (!code) throw new Error(url.searchParams.get("error_description") || "The calendar provider did not approve access.");
    const config = providerConfig(provider);
    const response = await fetch(config.tokenUrl, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, grant_type: "authorization_code", redirect_uri: callbackUrl(provider, url.origin) }),
      cache: "no-store",
    });
    const tokens = await response.json();
    if (!response.ok) throw new Error(tokens.error_description || tokens.error || "The calendar provider could not finish connecting.");
    if (!tokens.refresh_token) {
      const admin = serviceClient();
      const { data: previous } = await admin.from("provider_connections").select("encrypted_tokens").eq("user_id", user.id).eq("provider", provider).maybeSingle();
      if (previous?.encrypted_tokens) {
        const { decryptTokens } = await import("@/lib/providerOAuth");
        tokens.refresh_token = decryptTokens(previous.encrypted_tokens).refresh_token;
      }
    }
    if (!tokens.refresh_token) throw new Error("The provider did not issue offline access. Reconnect and approve calendar access.");
    const email = await providerEmail(provider, tokens.access_token);
    const admin = serviceClient();
    const { error } = await admin.from("provider_connections").upsert({
      user_id: user.id, provider, account_email: email, encrypted_tokens: encryptTokens(tokens),
      granted_scopes: String(tokens.scope || config.scopes.join(" ")).split(" ").filter(Boolean),
      expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });
    if (error) throw error;
    return toSettings({ connected: provider });
  } catch (error) {
    return toSettings({ integration_error: error.message || "Calendar connection failed." });
  }
}
