import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptTokens, encryptTokens, providerConfig, refreshProviderToken, serviceClient } from "@/lib/providerOAuth";

async function fetchProviderEvents(provider, accessToken, from, to) {
  const events = [];
  if (provider === "google") {
    let next = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    next.searchParams.set("timeMin", from);
    next.searchParams.set("timeMax", to);
    next.searchParams.set("singleEvents", "true");
    next.searchParams.set("orderBy", "startTime");
    next.searchParams.set("maxResults", "2500");
    while (next) {
      const response = await fetch(next, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Google Calendar could not be read.");
      events.push(...(body.items || []));
      next = body.nextPageToken ? new URL(`https://www.googleapis.com/calendar/v3/calendars/primary/events?pageToken=${encodeURIComponent(body.nextPageToken)}&timeMin=${encodeURIComponent(from)}&timeMax=${encodeURIComponent(to)}&singleEvents=true&orderBy=startTime&maxResults=2500`) : null;
      if (events.length >= 5000) break;
    }
    return events.map((item) => ({ id: item.id, title: item.summary || "Calendar event", description: item.description || null, start: item.start?.dateTime || `${item.start?.date}T00:00:00Z`, end: item.end?.dateTime || (item.end?.date ? `${item.end.date}T00:00:00Z` : null) }));
  }
  let next = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  next.searchParams.set("startDateTime", from);
  next.searchParams.set("endDateTime", to);
  next.searchParams.set("$select", "id,subject,bodyPreview,start,end,isCancelled");
  next.searchParams.set("$top", "1000");
  while (next) {
    const response = await fetch(next, { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' }, cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || "Microsoft Calendar could not be read.");
    events.push(...(body.value || []));
    next = body["@odata.nextLink"] ? new URL(body["@odata.nextLink"]) : null;
    if (events.length >= 5000) break;
  }
  return events.filter((item) => !item.isCancelled).map((item) => ({ id: item.id, title: item.subject || "Calendar event", description: item.bodyPreview || null, start: `${item.start.dateTime}${item.start.dateTime.endsWith("Z") ? "" : "Z"}`, end: item.end?.dateTime ? `${item.end.dateTime}${item.end.dateTime.endsWith("Z") ? "" : "Z"}` : null }));
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const { provider } = await request.json();
    if (!['google', 'microsoft'].includes(provider)) return NextResponse.json({ error: "Choose Google or Microsoft." }, { status: 400 });
    const profile = await supabase.from("profiles").select("last_workspace_id").eq("id", user.id).maybeSingle();
    if (profile.error) throw profile.error;
    let workspaceId = profile.data?.last_workspace_id;
    if (!workspaceId) {
      const membership = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (membership.error) throw membership.error;
      workspaceId = membership.data?.workspace_id;
    }
    if (!workspaceId) throw new Error("No workspace is available for this account.");
    const admin = serviceClient();
    const saved = await admin.from("provider_connections").select("encrypted_tokens,expires_at").eq("user_id", user.id).eq("provider", provider).maybeSingle();
    if (saved.error || !saved.data) throw new Error("Connect this calendar provider first.");
    let tokens = decryptTokens(saved.data.encrypted_tokens);
    if (!tokens.access_token || new Date(saved.data.expires_at).getTime() < Date.now() + 120_000) {
      tokens = await refreshProviderToken(provider, tokens);
      const { error } = await admin.from("provider_connections").update({ encrypted_tokens: encryptTokens(tokens), expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("provider", provider);
      if (error) throw error;
    }
    const from = new Date(Date.now() - 90 * 86400000).toISOString();
    const to = new Date(Date.now() + 365 * 86400000).toISOString();
    const sourceEvents = await fetchProviderEvents(provider, tokens.access_token, from, to);
    const rows = sourceEvents.filter((item) => item.id && item.start).map((item) => ({
      workspace_id: workspaceId, external_provider: provider, external_event_id: item.id,
      title: item.title, description: item.description, kind: "other",
      starts_at: item.start, ends_at: item.end,
    }));
    if (rows.length) {
      const { error } = await supabase.from("calendar_events").upsert(rows, { onConflict: "workspace_id,external_provider,external_event_id" });
      if (error) throw error;
    }
    return NextResponse.json({ synced: rows.length, provider });
  } catch (error) { return NextResponse.json({ error: error.message || "Calendar sync failed." }, { status: 400 }); }
}
