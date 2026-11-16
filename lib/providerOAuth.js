import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function providerConfig(provider) {
  if (provider === "google") return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.readonly"],
  };
  if (provider === "microsoft") return {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "profile", "offline_access", "User.Read", "Calendars.Read"],
  };
  throw new Error("Unsupported calendar provider.");
}

export function callbackUrl(provider, origin) {
  const site = process.env.FLOWBASE_SITE_URL || origin;
  return `${site.replace(/\/$/, "")}/api/integrations/${provider}/callback`;
}

function encryptionKey() {
  const value = process.env.FLOWBASE_TOKEN_ENCRYPTION_KEY || "";
  const key = Buffer.from(value, "hex");
  if (key.length !== 32) throw new Error("FLOWBASE_TOKEN_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes).");
  return key;
}

export function encryptTokens(tokens) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptTokens(value) {
  const [iv, tag, body] = String(value || "").split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8"));
}

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set on the server for secure provider token storage.");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function providerEmail(provider, accessToken) {
  const url = provider === "google" ? "https://www.googleapis.com/oauth2/v2/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error("The provider account could not be identified.");
  const data = await response.json();
  return provider === "google" ? data.email : (data.mail || data.userPrincipalName || "");
}

export async function refreshProviderToken(provider, tokens) {
  if (!tokens.refresh_token) throw new Error("Provider access expired. Reconnect this calendar account.");
  const config = providerConfig(provider);
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token", refresh_token: tokens.refresh_token, scope: config.scopes.join(" ") });
  const response = await fetch(config.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Could not refresh provider access.");
  return { ...tokens, ...data, refresh_token: data.refresh_token || tokens.refresh_token };
}
