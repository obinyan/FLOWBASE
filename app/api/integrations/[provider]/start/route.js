import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callbackUrl, providerConfig } from "@/lib/providerOAuth";

export async function GET(request, context) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;
  try {
    const config = providerConfig(provider);
    if (!config.clientId || !config.clientSecret) throw new Error(`${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET must be configured in Vercel.`);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/", origin));
    const state = randomBytes(32).toString("hex");
    const url = new URL(config.authorizeUrl);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", callbackUrl(provider, origin));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes.join(" "));
    url.searchParams.set("state", state);
    if (provider === "google") {
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
      url.searchParams.set("include_granted_scopes", "true");
    }
    const response = NextResponse.redirect(url);
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/integrations", maxAge: 600 };
    response.cookies.set("flowbase_provider_state", state, options);
    response.cookies.set("flowbase_provider_user", user.id, options);
    response.cookies.set("flowbase_provider_name", provider, options);
    return response;
  } catch (error) {
    const url = new URL("/settings", origin);
    url.searchParams.set("integration_error", error.message);
    return NextResponse.redirect(url);
  }
}
