// Supabase-backed version of lib/leads.js.
//
// The rest of the app keeps calling readLeads() / writeLeads() / createLead() exactly as before.
// Behind the scenes:
//   * readLeads()  returns an in-memory copy (instantly), kept fresh from Supabase.
//   * writeLeads() updates the screen immediately, then saves only what changed to Supabase.
//   * If a save is refused (no permission, offline...) the screen reverts to the server's copy
//     and a "flowbase:sync-error" event is fired so you can show a message.
import { createClient } from "@/lib/supabase/client";
import { ensureWorkspace } from "@/lib/workspace";

export const LEADS_KEY = "flowbase:leads:v2";
export const LEADS_EVENT = "flowbase:leads-updated";
export const ADD_LEAD_EVENT = "flowbase:open-add-lead";
export const SYNC_ERROR_EVENT = "flowbase:sync-error";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === "string" && UUID.test(value);
const shortDate = (value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const clean = (value) => {
  const text = typeof value === "string" ? value.trim() : value;
  return text ? text : null;
};

// ---------------------------------------------------------------- local state
let cache = null;                       // array of leads in the UI's shape
let lookupsFor = null;                  // workspace id the lookups below were loaded for
let stages = { byName: new Map(), byId: new Map() };
let members = { me: null, byName: new Map(), byId: new Map() };
let queue = Promise.resolve();          // saves run one after another, in order
let pending = 0;                        // how many saves are still in flight
let refreshTimer = null;

function persist() {
  try { window.localStorage.setItem(LEADS_KEY, JSON.stringify(cache || [])); } catch {}
  window.dispatchEvent(new Event(LEADS_EVENT));
}

export function resetLeads() {
  cache = [];
  lookupsFor = null;
  stages = { byName: new Map(), byId: new Map() };
  members = { me: null, byName: new Map(), byId: new Map() };
}

// ---------------------------------------------------------------- UI <-> database mapping
function ownerLabel(ownerId) {
  if (!ownerId) return "Unassigned";
  if (ownerId === members.me) return "You";
  return members.byId.get(ownerId) || "Teammate";
}

function resolveOwnerId(name) {
  if (!name || name === "You") return members.me;
  return members.byName.get(String(name).trim().toLowerCase()) || null;
}

function toUi(row) {
  const name = row.business_name || "";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return {
    id: row.id,
    name, businessName: name,
    contact: row.contact_name || "New contact", contactName: row.contact_name || "",
    initials,
    value: (Number(row.value_minor) || 0) / 100,
    stage: stages.byId.get(row.stage_id) || "New",
    source: row.source || "Other", sourceDetail: row.source_detail || "",
    owner: ownerLabel(row.owner_id),
    date: shortDate(row.created_at), createdAt: row.created_at,
    followUp: row.follow_up_date ? shortDate(`${row.follow_up_date}T12:00:00`) : "Not scheduled",
    followUpDate: row.follow_up_date || "",
    priority: Boolean(row.priority),
    recordType: row.record_type === "client" ? "client" : undefined,
    email: row.email || "", phone: row.phone || "", website: row.website || "",
    instagram: row.instagram || "", tiktok: row.tiktok || "", linkedin: row.linkedin || "", facebook: row.facebook || "",
    address: row.address || "", industry: row.industry || "", about: row.about || "", notes: row.notes || "",
    service: row.service || "",
  };
}

function toRow(lead) {
  const row = {
    record_type: lead.recordType === "client" ? "client" : "lead",
    business_name: (lead.name || lead.businessName || "").trim() || "Untitled",
    contact_name: clean(lead.contactName) ?? (lead.contact && lead.contact !== "New contact" ? lead.contact : null),
    email: clean(lead.email), phone: clean(lead.phone), website: clean(lead.website),
    instagram: clean(lead.instagram), tiktok: clean(lead.tiktok),
    linkedin: clean(lead.linkedin), facebook: clean(lead.facebook),
    address: clean(lead.address), industry: clean(lead.industry),
    about: clean(lead.about), notes: clean(lead.notes), service: clean(lead.service),
    source: clean(lead.source), source_detail: clean(lead.sourceDetail),
    owner_id: resolveOwnerId(lead.owner),
    value_minor: Math.round((Number(lead.value) || 0) * 100),
    follow_up_date: lead.followUpDate || null,
    priority: Boolean(lead.priority),
  };
  const stageId = stages.byName.get(lead.stage);
  if (stageId) row.stage_id = stageId;     // if unknown, leave it alone (database picks the first stage on insert)
  return row;
}

// ---------------------------------------------------------------- reading
export function readLeads() {
  if (typeof window === "undefined") return [];
  if (cache === null) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(LEADS_KEY) || "[]");
      cache = Array.isArray(stored) ? stored : [];
    } catch { cache = []; }
  }
  return cache;
}

async function loadLookups(supabase, workspaceId) {
  if (lookupsFor === workspaceId) return;
  const [stageResult, memberResult, userResult] = await Promise.all([
    supabase.from("pipeline_stages").select("id,name").eq("workspace_id", workspaceId),
    supabase.from("workspace_members").select("user_id, profiles(first_name,last_name,email)").eq("workspace_id", workspaceId),
    supabase.auth.getUser(),
  ]);
  if (stageResult.error) throw stageResult.error;
  if (memberResult.error) throw memberResult.error;

  stages = { byName: new Map(), byId: new Map() };
  (stageResult.data || []).forEach((s) => { stages.byName.set(s.name, s.id); stages.byId.set(s.id, s.name); });

  members = { me: userResult.data?.user?.id || null, byName: new Map(), byId: new Map() };
  (memberResult.data || []).forEach((m) => {
    const first = (m.profiles?.first_name || "").trim();
    const last = (m.profiles?.last_name || "").trim();
    const label = first || (m.profiles?.email || "").split("@")[0] || "Teammate";
    members.byId.set(m.user_id, label);
    members.byName.set(label.toLowerCase(), m.user_id);
    if (first && last) members.byName.set(`${first} ${last}`.toLowerCase(), m.user_id);
  });
  lookupsFor = workspaceId;
}

// Pull the latest leads from Supabase into the screen.
export async function refreshLeads() {
  if (typeof window === "undefined" || pending > 0) return;   // never overwrite edits that are still saving
  const supabase = createClient();
  const workspaceId = await ensureWorkspace();
  if (!workspaceId) return;
  try {
    await loadLookups(supabase, workspaceId);
    const { data, error } = await supabase
      .from("leads").select("*").eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    cache = (data || []).map(toUi);
    persist();
  } catch (error) {
    reportError(error);
  }
}

export function scheduleRefreshLeads() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshLeads, 400);
}

// ---------------------------------------------------------------- writing
function reportError(error) {
  console.error("Flowbase leads sync error:", error);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_ERROR_EVENT, { detail: error?.message || String(error) }));
  }
}

async function pushChanges(previous, next) {
  const supabase = createClient();
  const workspaceId = await ensureWorkspace();
  if (!workspaceId) throw new Error("You are not signed in.");
  await loadLookups(supabase, workspaceId);

  const before = new Map(previous.map((lead) => [lead.id, lead]));
  const after = new Map(next.map((lead) => [lead.id, lead]));

  for (const id of before.keys()) {
    if (after.has(id) || !isUuid(id)) continue;
    const { data, error } = await supabase.from("leads").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("You don't have permission to delete this lead.");
  }

  for (const [id, lead] of after) {
    if (!isUuid(id)) continue;                           // old pre-Supabase records are ignored
    const old = before.get(id);
    if (!old) {
      const { error } = await supabase.from("leads").insert({ id, workspace_id: workspaceId, ...toRow(lead) });
      if (error) throw error;
    } else if (JSON.stringify(toRow(old)) !== JSON.stringify(toRow(lead))) {
      const { data, error } = await supabase.from("leads").update(toRow(lead)).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("You don't have permission to change this lead.");
    }
  }
}

export function writeLeads(leads) {
  if (typeof window === "undefined") return;
  const previous = readLeads();
  const next = Array.isArray(leads) ? leads : [];
  cache = next;
  persist();                                             // screen updates instantly

  pending += 1;
  queue = queue
    .then(() => pushChanges(previous, next))
    .catch(reportError)
    .finally(() => {
      pending -= 1;
      if (pending === 0) scheduleRefreshLeads();         // re-sync with the server's truth
    });
}

export function createLead(details) {
  const name = (details.businessName || "").trim();
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return {
    ...details,
    id: crypto.randomUUID(),
    name, contact: details.contactName || "New contact", initials,
    value: Number(details.value) || 0, stage: details.stage || "New", source: details.source || "Other",
    owner: details.owner || "You",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), createdAt: new Date().toISOString(),
    followUp: details.followUpDate ? new Date(`${details.followUpDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Not scheduled",
    priority: Boolean(details.priority),
  };
}
