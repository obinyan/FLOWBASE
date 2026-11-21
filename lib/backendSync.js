import { createClient } from "@/lib/supabase/client";
import { ensureWorkspace } from "@/lib/workspace";
import { readLeads } from "@/lib/leads";
import { readInbox } from "@/lib/inbox";

const KEYS = {
  tasks: "flowbase:tasks:v2",
  calendar: "flowbase:calendar:v2",
  inbox: "flowbase:inbox:v1",
  payments: "flowbase:payments:v1",
  activity: "flowbase:client-activity:v1",
  analyses: "flowbase:analysis-history:v1",
  settings: "flowbase:settings",
};
const ACCOUNT_BACKUP_PREFIX = "flowbase:account-backup:";
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const isUuid = (value) => UUID.test(String(value || ""));
const makeId = () => crypto.randomUUID();
const upper = (value) => String(value || "").toLowerCase().replace(/(^|_)([a-z])/g, (_, p, c) => `${p ? " " : ""}${c.toUpperCase()}`);
const lower = (value) => String(value || "").toLowerCase().replace(/[\s-]+/g, "_");

let scope = null;
let client = null;
let memberNames = new Map();
let memberIds = new Map();
let leadNames = new Map();
let workspaceCurrency = "USD";
let originalSetItem = null;
let originalRemoveItem = null;
let remoteWrite = false;
let hydrating = false;
let channel = null;
let snapshotQueue = Promise.resolve();

export function preserveLocalAccount(userId) {
  if (!userId || typeof window === "undefined") return;
  const records = {};
  for (const key of Object.values(KEYS)) {
    const value = window.localStorage.getItem(key);
    if (value !== null) records[key] = value;
  }
  if (Object.keys(records).length) {
    try { window.localStorage.setItem(`${ACCOUNT_BACKUP_PREFIX}${userId}`, JSON.stringify(records)); } catch {}
  }
}

export function restoreLocalAccount(userId) {
  if (!userId || typeof window === "undefined") return;
  try {
    const records = JSON.parse(window.localStorage.getItem(`${ACCOUNT_BACKUP_PREFIX}${userId}`) || "{}");
    for (const [key, value] of Object.entries(records)) {
      if (Object.values(KEYS).includes(key) && window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    }
  } catch {}
}

function rawSet(key, value) {
  originalSetItem?.call(window.localStorage, key, value);
}

function event(name) {
  window.dispatchEvent(new Event(name));
}

function announceKey(key) {
  if (key === KEYS.tasks) event("flowbase:tasks-updated");
  if (key === KEYS.calendar) event("flowbase:calendar-updated");
  if (key === KEYS.inbox) event("flowbase:inbox-updated");
  if (key === KEYS.payments) event("flowbase:payments-updated");
  if (key === KEYS.activity) event("flowbase:client-activity-updated");
  if (key === KEYS.analyses) event("flowbase:report-history-updated");
  if (key === KEYS.settings) event("flowbase:settings-updated");
}

function localJson(key, fallback) {
  try { return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

function normalizeIds(items) {
  let changed = false;
  const normalized = (Array.isArray(items) ? items : []).map((item) => {
    if (!item || isUuid(item.id)) return item;
    changed = true;
    return { ...item, id: makeId() };
  });
  return { normalized, changed };
}

function writeLocal(key, value) {
  remoteWrite = true;
  rawSet(key, JSON.stringify(value));
  remoteWrite = false;
  announceKey(key);
}

function leadIdFor(label) {
  if (isUuid(label)) return label;
  return leadNames.get(String(label || "").trim().toLowerCase()) || null;
}

function dbError(error, message) {
  if (error) {
    console.error(message, error.message || error);
    window.dispatchEvent(new CustomEvent("flowbase:sync-error", { detail: error.message || message }));
  }
  return error;
}

async function fetchMembers() {
  const { data, error } = await client.from("workspace_members")
    .select("user_id,role,status,job_title,profiles(first_name,last_name,email)")
    .eq("workspace_id", scope.workspaceId);
  if (error) throw error;
  memberNames = new Map();
  memberIds = new Map();
  for (const item of data || []) {
    const profile = item.profiles || {};
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email?.split("@")[0] || "Teammate";
    memberNames.set(item.user_id, name);
    memberIds.set(name.toLowerCase(), item.user_id);
    if (profile.email) memberIds.set(profile.email.toLowerCase(), item.user_id);
  }
  return data || [];
}

async function fetchLeads() {
  const { data, error } = await client.from("leads").select("id,business_name,contact_name,email").eq("workspace_id", scope.workspaceId);
  if (error) throw error;
  leadNames = new Map();
  for (const lead of data || []) {
    for (const name of [lead.business_name, lead.contact_name, lead.email]) {
      if (name) leadNames.set(name.toLowerCase(), lead.id);
    }
  }
}

function taskFromRow(row) {
  return {
    id: row.id, title: row.title, detail: row.detail || "", priority: upper(row.priority),
    due: row.due_date || "", date: row.due_date || "", time: String(row.due_time || "09:00").slice(0, 5),
    completed: Boolean(row.completed_at), owner: memberNames.get(row.owner_id) || "You",
    lead: row.lead_id ? (readLeads().find((item) => item.id === row.lead_id)?.name || "") : "",
    clientId: row.lead_id || undefined,
  };
}

function taskToRow(task) {
  const priority = lower(task.priority || "medium");
  return {
    id: task.id, workspace_id: scope.workspaceId, title: task.title || "Untitled task", detail: task.detail || null,
    priority: ["urgent", "high", "medium", "low"].includes(priority) ? priority : "medium",
    due_date: task.due || task.date || null, due_time: task.time || null,
    lead_id: task.clientId && isUuid(task.clientId) ? task.clientId : leadIdFor(task.lead),
    owner_id: memberIds.get(String(task.owner || "").toLowerCase()) || null,
    completed_at: task.completed ? new Date().toISOString() : null,
  };
}

function eventFromRow(row) {
  const date = new Date(row.starts_at);
  const kind = ({ follow_up: "Follow-up", other: "Task" })[row.kind] || upper(row.kind);
  return {
    id: row.id, date: date.toISOString().slice(0, 10), time: date.toTimeString().slice(0, 5),
    title: row.title, lead: row.lead_id ? (readLeads().find((item) => item.id === row.lead_id)?.name || "") : "",
    description: row.description || "", kind, owner: memberNames.get(row.owner_id) || "You",
    leadId: row.lead_id || null,
  };
}

function eventToRow(item) {
  const kind = ({ "Follow-up": "follow_up", Task: "other", Call: "call", Proposal: "proposal", Review: "review" })[item.kind] || "other";
  const startsAt = new Date(`${item.date}T${item.time || "09:00"}:00`).toISOString();
  return {
    id: item.id, workspace_id: scope.workspaceId, title: item.title || "Event", description: item.description || null,
    kind, starts_at: startsAt, lead_id: item.leadId || leadIdFor(item.lead), owner_id: memberIds.get(String(item.owner || "").toLowerCase()) || null,
  };
}

function paymentFromRow(row) {
  return { id: row.id, clientId: row.lead_id, service: row.service || "", amount: Number(row.amount_minor || 0) / 100,
    currency: row.currency || workspaceCurrency, status: upper(row.status), date: row.payment_date || "", source: upper(row.source), createdAt: row.created_at };
}

function paymentToRow(item) {
  if (!isUuid(item.clientId)) return null;
  return { id: item.id, workspace_id: scope.workspaceId, lead_id: item.clientId,
    service: item.service || null, amount_minor: Math.round(Number(item.amount || 0) * 100),
    currency: item.currency || workspaceCurrency, status: lower(item.status || "expected"), payment_date: item.date || null, source: "manual" };
}

function activityFromRow(row) {
  return { id: row.id, clientId: row.lead_id, paymentId: row.payment_id || null, type: row.type, title: row.title, note: row.note || "", createdAt: row.created_at };
}

function activityToRow(item) {
  if (!isUuid(item.clientId) || item.type === "payment") return null;
  return { id: item.id, workspace_id: scope.workspaceId, lead_id: item.clientId,
    type: ["system", "work", "payment", "note"].includes(item.type) ? item.type : "note",
    title: item.title || "Client update", note: item.note || null };
}

function toTimeLabel(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function conversationFromRows(row, messageRows, state, attachmentsByMessage) {
  const lead = readLeads().find((item) => item.id === row.lead_id);
  const messages = messageRows.map((message) => ({ id: message.id,
    side: message.sender_id === scope.userId ? "me" : "them", text: message.body,
    time: toTimeLabel(message.sent_at), sentAt: message.sent_at, attachments: attachmentsByMessage.get(message.id) || [] }));
  const last = messageRows.at(-1);
  return { id: row.id, name: lead?.contact || lead?.name || row.subject || "Conversation", detail: lead?.name || row.channel,
    initials: (lead?.initials || row.subject || "?").slice(0, 2).toUpperCase(), preview: last?.body || "", time: last ? toTimeLabel(last.sent_at) : "",
    unread: Boolean(last && last.sender_id !== scope.userId && (!state?.last_read_at || new Date(last.sent_at) > new Date(state.last_read_at))),
    archived: Boolean(state?.archived), lead: lead?.name || "", leadId: row.lead_id, messages };
}

async function refreshTasks() {
  const { data, error } = await client.from("tasks").select("*").eq("workspace_id", scope.workspaceId).order("due_date", { ascending: true, nullsFirst: false });
  if (dbError(error, "Could not load Flowbase tasks:")) return;
  writeLocal(KEYS.tasks, (data || []).map(taskFromRow));
}

async function refreshCalendar() {
  const { data, error } = await client.from("calendar_events").select("*").eq("workspace_id", scope.workspaceId).order("starts_at");
  if (dbError(error, "Could not load Flowbase calendar events:")) return;
  const existing = localJson(KEYS.calendar, []);
  const taskItems = existing.filter((item) => item.taskId || String(item.id).startsWith("task-"));
  writeLocal(KEYS.calendar, [...(data || []).map(eventFromRow), ...taskItems]);
}

async function refreshPayments() {
  const { data, error } = await client.from("payments").select("*").eq("workspace_id", scope.workspaceId).order("created_at", { ascending: false });
  if (dbError(error, "Could not load Flowbase payments:")) return;
  writeLocal(KEYS.payments, (data || []).map(paymentFromRow));
}

async function refreshActivity() {
  const { data, error } = await client.from("lead_activities").select("*").eq("workspace_id", scope.workspaceId).order("created_at", { ascending: false });
  if (dbError(error, "Could not load client activity:")) return;
  writeLocal(KEYS.activity, (data || []).map(activityFromRow));
}

async function refreshInbox() {
  const [conversations, notifications] = await Promise.all([
    client.from("conversations").select("*").eq("workspace_id", scope.workspaceId).order("last_message_at", { ascending: false }),
    client.from("notifications").select("*").eq("workspace_id", scope.workspaceId).eq("user_id", scope.userId).order("created_at", { ascending: false }),
  ]);
  if (dbError(conversations.error, "Could not load conversations:") || dbError(notifications.error, "Could not load notifications:")) return;
  const ids = (conversations.data || []).map((row) => row.id);
  const [messages, states] = ids.length ? await Promise.all([
    client.from("messages").select("*").eq("workspace_id", scope.workspaceId).in("conversation_id", ids).order("sent_at"),
    client.from("conversation_user_state").select("*").eq("workspace_id", scope.workspaceId).eq("user_id", scope.userId).in("conversation_id", ids),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (dbError(messages.error, "Could not load messages:") || dbError(states.error, "Could not load conversation state:")) return;
  const messageIds = (messages.data || []).map((item) => item.id);
  const attachmentResult = messageIds.length
    ? await client.from("attachments").select("id,owner_id,object_path,file_name,mime_type").eq("workspace_id", scope.workspaceId).eq("owner_type", "message").in("owner_id", messageIds)
    : { data: [], error: null };
  if (dbError(attachmentResult.error, "Could not load message attachments:")) return;
  const attachmentsByMessage = new Map();
  await Promise.all((attachmentResult.data || []).map(async (attachment) => {
    const { data } = await client.storage.from("attachments").createSignedUrl(attachment.object_path, 3600);
    const item = { id: attachment.id, name: attachment.file_name, url: data?.signedUrl || "" };
    attachmentsByMessage.set(attachment.owner_id, [...(attachmentsByMessage.get(attachment.owner_id) || []), item]);
  }));
  const messagesByConversation = new Map();
  for (const item of messages.data || []) messagesByConversation.set(item.conversation_id, [...(messagesByConversation.get(item.conversation_id) || []), item]);
  const stateByConversation = new Map((states.data || []).map((item) => [item.conversation_id, item]));
  const uiMessages = (conversations.data || []).map((row) => conversationFromRows(row, messagesByConversation.get(row.id) || [], stateByConversation.get(row.id), attachmentsByMessage));
  const uiNotifications = (notifications.data || []).map((item) => ({ id: item.id, title: item.title, detail: item.detail || "", href: item.href || "/inbox", unread: !item.read_at, time: toTimeLabel(item.created_at), icon: "bell", color: "blue" }));
  writeLocal(KEYS.inbox, { messages: uiMessages, notifications: uiNotifications });
}

async function refreshAnalyses() {
  const { data, error } = await client.from("saved_analyses").select("*").eq("workspace_id", scope.workspaceId).eq("user_id", scope.userId).order("created_at", { ascending: false });
  if (dbError(error, "Could not load saved analyses:")) return;
  writeLocal(KEYS.analyses, (data || []).map((row) => ({ id: row.id, question: row.question, summary: row.summary || "", details: row.details || "", metric: row.metric || "", result: row.summary || row.details || "", createdAt: row.created_at })));
}

async function syncSettings(value) {
  const settings = typeof value === "string" ? JSON.parse(value) : value;
  const preferences = { language: settings.language || "English", twoFactor: Boolean(settings.twoFactor) };
  const { error } = await client.from("profiles").update({
    first_name: settings.firstName || "", last_name: settings.lastName || "", phone: settings.phone || null,
    timezone: settings.timezone || "UTC", theme: lower(settings.theme || "system"),
    email_updates: settings.emailUpdates !== false, weekly_digest: settings.weeklyDigest !== false,
    product_tips: Boolean(settings.productTips), preferences,
  }).eq("id", scope.userId);
  dbError(error, "Could not save Flowbase settings:");
}

function diffById(before, after) {
  const oldMap = new Map((Array.isArray(before) ? before : []).filter((item) => isUuid(item?.id)).map((item) => [item.id, item]));
  const newMap = new Map((Array.isArray(after) ? after : []).filter((item) => isUuid(item?.id)).map((item) => [item.id, item]));
  return { removed: [...oldMap.keys()].filter((id) => !newMap.has(id)), changed: [...newMap.values()].filter((item) => JSON.stringify(oldMap.get(item.id)) !== JSON.stringify(item)) };
}

async function syncRows(key, before, after) {
  const diff = diffById(before, after);
  const table = key === KEYS.tasks ? "tasks" : key === KEYS.calendar ? "calendar_events" : key === KEYS.payments ? "payments" : key === KEYS.activity ? "lead_activities" : null;
  if (!table) return;
  const mapper = key === KEYS.tasks ? taskToRow : key === KEYS.calendar ? eventToRow : key === KEYS.payments ? paymentToRow : activityToRow;
  if (diff.removed.length) {
    const { error } = await client.from(table).delete().eq("workspace_id", scope.workspaceId).in("id", diff.removed);
    dbError(error, `Could not delete ${table} records:`);
  }
  if (diff.changed.length) {
    const rows = diff.changed.map(mapper).filter(Boolean);
    if (rows.length) {
      // Activity rows are append-only for members in the supplied RLS policies;
      // update changed rows individually and allow the server to reject forbidden edits.
      const { error } = table === "lead_activities"
        ? await client.from(table).insert(rows.filter((row) => !diff.removed.includes(row.id)))
        : await client.from(table).upsert(rows);
      dbError(error, `Could not save ${table} records:`);
    }
  }
}

async function syncInbox(before, after) {
  const previous = before && typeof before === "object" ? before : { messages: [], notifications: [] };
  const next = after && typeof after === "object" ? after : { messages: [], notifications: [] };
  const oldConversations = new Map((previous.messages || []).filter((item) => isUuid(item.id)).map((item) => [item.id, item]));
  const newConversations = new Map((next.messages || []).filter((item) => isUuid(item.id)).map((item) => [item.id, item]));
  for (const [id, item] of newConversations) {
    const prior = oldConversations.get(id);
    if (!prior) {
      const row = { id, workspace_id: scope.workspaceId, lead_id: item.leadId || leadIdFor(item.name), subject: item.name || "", channel: "internal", last_message_at: new Date().toISOString() };
      const { error } = await client.from("conversations").insert(row);
      if (dbError(error, "Could not create conversation:")) continue;
      await syncConversationMessages(id, [], item.messages || []);
    } else {
      await syncConversationMessages(id, prior.messages || [], item.messages || []);
      if (prior.archived !== item.archived || prior.unread !== item.unread) {
        const lastRead = item.unread ? null : new Date().toISOString();
        const { error } = await client.from("conversation_user_state").upsert({ workspace_id: scope.workspaceId, conversation_id: id, user_id: scope.userId, archived: Boolean(item.archived), last_read_at: lastRead }, { onConflict: "conversation_id,user_id" });
        dbError(error, "Could not save conversation state:");
      }
    }
  }
  const removedConversationIds = [...oldConversations.keys()].filter((id) => !newConversations.has(id));
  if (removedConversationIds.length) {
    const { error } = await client.from("conversation_user_state").upsert(removedConversationIds.map((id) => ({ workspace_id: scope.workspaceId, conversation_id: id, user_id: scope.userId, archived: true })), { onConflict: "conversation_id,user_id" });
    dbError(error, "Could not archive conversations:");
  }
  const oldNotes = new Map((previous.notifications || []).filter((item) => isUuid(item.id)).map((item) => [item.id, item]));
  for (const item of next.notifications || []) {
    const old = oldNotes.get(item.id);
    if (old && old.unread && !item.unread) {
      const { error } = await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id).eq("user_id", scope.userId);
      dbError(error, "Could not mark notification read:");
    }
  }
}

async function syncConversationMessages(conversationId, before, after) {
  const oldMap = new Map((before || []).filter((item) => isUuid(item.id)).map((item) => [item.id, item]));
  const rows = (after || []).filter((item) => isUuid(item.id) && !oldMap.has(item.id)).map((item) => ({
    id: item.id, workspace_id: scope.workspaceId, conversation_id: conversationId,
    direction: "internal", sender_id: scope.userId,
    body: item.text || "", delivery_status: "internal",
    sent_at: item.sentAt || new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await client.from("messages").insert(rows);
    dbError(error, "Could not save conversation message:");
  }
}

async function syncAnalyses(before, after) {
  const oldMap = new Map((before || []).filter((item) => isUuid(item.id)).map((item) => [item.id, item]));
  const rows = (after || []).filter((item) => isUuid(item.id) && !oldMap.has(item.id)).map((item) => ({
    id: item.id, workspace_id: scope.workspaceId, user_id: scope.userId,
    question: item.question || "", summary: item.summary || item.result || "", details: item.details || "", metric: item.metric || "",
  }));
  if (rows.length) {
    const { error } = await client.from("saved_analyses").insert(rows);
    dbError(error, "Could not save report analysis:");
  }
  const removed = [...oldMap.keys()].filter((id) => !(after || []).some((item) => item.id === id));
  if (removed.length) {
    const { error } = await client.from("saved_analyses").delete().eq("workspace_id", scope.workspaceId).in("id", removed);
    dbError(error, "Could not delete report analysis:");
  }
}

function captureWrites() {
  if (originalSetItem) return;
  originalSetItem = Storage.prototype.setItem;
  originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (key, value) {
    const beforeRaw = this === window.localStorage && Object.values(KEYS).includes(key) ? this.getItem(key) : null;
    originalSetItem.call(this, key, value);
    if (this !== window.localStorage || remoteWrite || hydrating || !scope || !Object.values(KEYS).includes(key)) return;
    let before;
    let after;
    try { before = beforeRaw ? JSON.parse(beforeRaw) : (key === KEYS.inbox ? { messages: [], notifications: [] } : []); } catch { before = key === KEYS.inbox ? { messages: [], notifications: [] } : []; }
    try { after = JSON.parse(String(value)); } catch { return; }
    snapshotQueue = snapshotQueue.then(async () => {
      if (key === KEYS.settings) return syncSettings(after);
      if (key === KEYS.inbox) return syncInbox(before, after);
      if (key === KEYS.analyses) return syncAnalyses(before, after);
      return syncRows(key, before, after);
    }).catch((error) => dbError(error, `Could not sync ${key}:`));
  };
  Storage.prototype.removeItem = function (key) {
    const beforeRaw = this === window.localStorage && Object.values(KEYS).includes(key) ? this.getItem(key) : null;
    originalRemoveItem.call(this, key);
    if (this !== window.localStorage || remoteWrite || hydrating || !scope || !beforeRaw) return;
    try {
      const before = JSON.parse(beforeRaw);
      snapshotQueue = snapshotQueue.then(() => key === KEYS.settings ? Promise.resolve() : key === KEYS.inbox ? syncInbox(before, { messages: [], notifications: [] }) : key === KEYS.analyses ? syncAnalyses(before, []) : syncRows(key, before, []));
    } catch {}
  };
}

function normalizeLocalData() {
  for (const key of [KEYS.tasks, KEYS.payments, KEYS.activity, KEYS.analyses]) {
    const items = localJson(key, []);
    const { normalized, changed } = normalizeIds(items);
    if (changed) writeLocal(key, normalized);
  }
  const calendar = localJson(KEYS.calendar, []);
  const normalizedCalendar = calendar.map((item) => item?.taskId || String(item?.id).startsWith("task-") ? item : (isUuid(item?.id) ? item : { ...item, id: makeId() }));
  if (JSON.stringify(calendar) !== JSON.stringify(normalizedCalendar)) writeLocal(KEYS.calendar, normalizedCalendar);
  const inbox = localJson(KEYS.inbox, { messages: [], notifications: [] });
  let changed = false;
  for (const collection of [inbox.messages || [], inbox.notifications || []]) {
    for (const item of collection) if (item && !isUuid(item.id)) { item.id = makeId(); changed = true; }
    for (const conversation of collection === inbox.messages ? collection : []) {
      for (const message of conversation.messages || []) if (!isUuid(message.id)) { message.id = makeId(); changed = true; }
    }
  }
  if (changed) writeLocal(KEYS.inbox, inbox);
}

async function migrateLocalSnapshot(key, rows, mapper) {
  const local = localJson(key, key === KEYS.inbox ? { messages: [], notifications: [] } : []);
  const hasLocal = key === KEYS.inbox ? (local.messages || []).length || (local.notifications || []).length : Array.isArray(local) && local.length;
  if (rows.length || !hasLocal) {
    if (key === KEYS.inbox) {
      await refreshInbox();
    } else {
      writeLocal(key, rows.map(mapper));
    }
    return;
  }
  if (key === KEYS.inbox) {
    await syncInbox({ messages: [], notifications: [] }, local);
    return;
  }
  const records = key === KEYS.calendar ? local.filter((item) => item && !item.taskId && !String(item.id).startsWith("task-")) : local;
  const { normalized, changed } = normalizeIds(records);
  if (changed) writeLocal(key, normalized);
  await syncRows(key, [], normalized);
}

export async function initializeBackendData(workspaceId, userId) {
  if (typeof window === "undefined") return;
  scope = { workspaceId, userId };
  hydrating = true;
  client = createClient();
  captureWrites();
  try {
    await Promise.all([fetchMembers(), fetchLeads()]);
    const workspaceRow = await client.from("workspaces").select("currency").eq("id", workspaceId).maybeSingle();
    if (workspaceRow.error) throw workspaceRow.error;
    workspaceCurrency = workspaceRow.data?.currency || "USD";
    const [tasks, events, payments, activity, analyses, conversations, notifications] = await Promise.all([
      client.from("tasks").select("*").eq("workspace_id", workspaceId),
      client.from("calendar_events").select("*").eq("workspace_id", workspaceId),
      client.from("payments").select("*").eq("workspace_id", workspaceId),
      client.from("lead_activities").select("*").eq("workspace_id", workspaceId),
      client.from("saved_analyses").select("*").eq("workspace_id", workspaceId).eq("user_id", userId),
      client.from("conversations").select("*").eq("workspace_id", workspaceId),
      client.from("notifications").select("*").eq("workspace_id", workspaceId).eq("user_id", userId),
    ]);
    for (const result of [tasks, events, payments, activity, analyses, conversations, notifications]) {
      if (result.error) throw result.error;
    }
    normalizeLocalData();
    const legacyInbox = readInbox();
    await migrateLocalSnapshot(KEYS.tasks, tasks.data || [], taskFromRow);
    await migrateLocalSnapshot(KEYS.calendar, events.data || [], eventFromRow);
    await migrateLocalSnapshot(KEYS.payments, payments.data || [], paymentFromRow);
    await migrateLocalSnapshot(KEYS.activity, activity.data || [], activityFromRow);
    await migrateLocalSnapshot(KEYS.analyses, analyses.data || [], (row) => ({ id: row.id, question: row.question, summary: row.summary || "", details: row.details || "", metric: row.metric || "", result: row.summary || row.details || "", createdAt: row.created_at }));
    if (!(conversations.data || []).length && ((legacyInbox.messages || []).length || (legacyInbox.notifications || []).length)) {
      await syncInbox({ messages: [], notifications: [] }, legacyInbox);
      if (!(notifications.data || []).length && (legacyInbox.notifications || []).length) {
        const { error } = await client.rpc("import_legacy_notifications", { p_workspace: workspaceId, p_items: legacyInbox.notifications });
        if (error) dbError(error, "Could not import notifications:");
      }
    }
    await refreshInbox();
    // Settings live on profiles so both the preferences and profile form use the same row.
    const { data: profile, error: profileError } = await client.from("profiles").select("first_name,last_name,email,phone,timezone,theme,email_updates,weekly_digest,product_tips,preferences,avatar_path").eq("id", userId).maybeSingle();
    if (profileError) throw profileError;
    if (profile) {
      const old = localJson(KEYS.settings, {});
      const preferences = profile.preferences || {};
      const hasSavedPreferences = Object.keys(preferences).length > 0;
      const workspace = await client.from("workspaces").select("name,currency").eq("id", workspaceId).maybeSingle();
      if (workspace.error) throw workspace.error;
      const settings = {
        ...old,
        firstName: profile.first_name || "", lastName: profile.last_name || "", email: profile.email || "", phone: profile.phone || "",
        timezone: old.timezone || profile.timezone || "UTC", theme: hasSavedPreferences ? upper(profile.theme || "system") : old.theme || upper(profile.theme || "system"),
        emailUpdates: hasSavedPreferences ? profile.email_updates : old.emailUpdates ?? profile.email_updates,
        weeklyDigest: hasSavedPreferences ? profile.weekly_digest : old.weeklyDigest ?? profile.weekly_digest,
        productTips: hasSavedPreferences ? profile.product_tips : old.productTips ?? profile.product_tips,
        workspace: workspace.data?.name || old.workspace || "Flowbase",
        currency: workspace.data?.currency || "USD",
        ...preferences,
      };
      if (!hasSavedPreferences && Object.keys(old).length) await syncSettings(settings);
      writeLocal(KEYS.settings, settings);
      if (profile.avatar_path) {
        const { data: signed } = await client.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600);
        if (signed?.signedUrl) {
          rawSet("flowbase:settings-photo", signed.signedUrl);
          event("flowbase:profile-photo-updated");
        }
      }
    }
    window.dispatchEvent(new Event("flowbase:records-ready"));
    subscribeRealtime();
  } catch (error) {
    dbError(error, "Flowbase backend initialization failed:");
  } finally {
    hydrating = false;
  }
}

function subscribeRealtime() {
  if (channel) client.removeChannel(channel);
  channel = client.channel(`flowbase-data-${scope.workspaceId}`);
  for (const table of ["tasks", "calendar_events", "payments", "lead_activities", "conversations", "messages", "notifications", "saved_analyses", "workspace_members", "invitations"]) {
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `workspace_id=eq.${scope.workspaceId}` }, () => {
      if (table === "tasks") void refreshTasks();
      if (table === "calendar_events") void refreshCalendar();
      if (table === "payments") void refreshPayments();
      if (table === "lead_activities") void refreshActivity();
      if (["conversations", "messages", "notifications"].includes(table)) void refreshInbox();
      if (table === "saved_analyses") void refreshAnalyses();
      window.dispatchEvent(new Event("flowbase:team-updated"));
    });
  }
  channel.subscribe();
}

export function resetBackendData() {
  if (channel && client) client.removeChannel(channel);
  channel = null; client = null; scope = null; hydrating = false; memberNames = new Map(); memberIds = new Map(); leadNames = new Map(); workspaceCurrency = "USD";
}

export async function uploadProfilePhoto(file) {
  if (!scope || !client) throw new Error("Sign in before uploading a profile photo.");
  const path = `${scope.userId}/profile-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
  const { error: uploadError } = await client.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;
  const { error } = await client.from("profiles").update({ avatar_path: path }).eq("id", scope.userId);
  if (error) throw error;
  const { data } = await client.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl || "";
}

export async function removeProfilePhoto() {
  if (!scope || !client) return;
  const { data: profile } = await client.from("profiles").select("avatar_path").eq("id", scope.userId).maybeSingle();
  if (profile?.avatar_path) {
    const { error } = await client.storage.from("avatars").remove([profile.avatar_path]);
    if (error) throw error;
  }
  const { error } = await client.from("profiles").update({ avatar_path: null }).eq("id", scope.userId);
  if (error) throw error;
  window.localStorage.removeItem("flowbase:settings-photo");
}

export async function uploadMessageAttachment(conversationId, messageId, file) {
  if (!scope || !client) throw new Error("Sign in before attaching a file.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${scope.workspaceId}/${conversationId}/${messageId}/${safeName}`;
  const { error: uploadError } = await client.storage.from("attachments").upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  if (uploadError) throw uploadError;
  const { error } = await client.from("attachments").insert({
    workspace_id: scope.workspaceId, owner_type: "message", owner_id: messageId,
    object_path: path, file_name: file.name, mime_type: file.type || null, size_bytes: file.size,
  });
  if (error) throw error;
  const { data } = await client.storage.from("attachments").createSignedUrl(path, 3600);
  return data?.signedUrl || "";
}

export async function deleteWorkspaceRecord(table, id) {
  if (!scope || !client || !["tasks", "calendar_events", "payments", "lead_activities"].includes(table)) throw new Error("The workspace is not ready to delete this record.");
  if (table === "payments" && !isUuid(id)) {
    writeLocal(KEYS.payments, localJson(KEYS.payments, []).filter((payment) => payment.id !== id));
    writeLocal(KEYS.activity, localJson(KEYS.activity, []).filter((item) => item.paymentId !== id));
    return;
  }
  const { data, error } = await client.from(table).delete().eq("workspace_id", scope.workspaceId).eq("id", id).select("id");
  if (error) throw error;
  if (table === "payments" && !data?.length) throw new Error("This payment was not deleted. Check your access and make sure the latest Supabase migration has been run.");
  if (table === "payments") {
    writeLocal(KEYS.payments, localJson(KEYS.payments, []).filter((payment) => payment.id !== id));
    writeLocal(KEYS.activity, localJson(KEYS.activity, []).filter((item) => item.paymentId !== id));
  }
}

export async function saveTeamRole(userId, role) {
  const value = lower(role);
  const { error } = await client.from("workspace_members").update({ role: value }).eq("workspace_id", scope.workspaceId).eq("user_id", userId);
  dbError(error, "Could not update team role:");
}

export async function changeMemberStatus(userId, status) {
  const { error } = await client.from("workspace_members").update({ status: lower(status) }).eq("workspace_id", scope.workspaceId).eq("user_id", userId);
  dbError(error, "Could not update member status:");
}

export async function removeWorkspaceMember(userId) {
  const { error } = await client.from("workspace_members").delete().eq("workspace_id", scope.workspaceId).eq("user_id", userId);
  dbError(error, "Could not remove workspace member:");
}

export async function getCurrentWorkspace() {
  const workspaceId = scope?.workspaceId || await ensureWorkspace();
  if (!workspaceId) return null;
  const { data, error } = await client.from("workspaces").select("id,name,currency,timezone").eq("id", workspaceId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateWorkspaceSettings({ name, currency }) {
  if (!scope) throw new Error("Workspace is not ready yet.");
  const update = {};
  if (typeof name === "string") {
    if (!name.trim()) throw new Error("Workspace name is required.");
    update.name = name.trim();
  }
  if (currency) {
    if (!["USD", "GBP", "EUR", "NGN"].includes(currency)) throw new Error("Choose a supported workspace currency.");
    const { error: currencyError } = await client.rpc("apply_workspace_default_currency", {
      p_workspace: scope.workspaceId,
      p_currency: currency,
    });
    if (currencyError) throw new Error(`Could not apply the default currency to existing payments. Run the latest Supabase migration and try again. ${currencyError.message}`);
  }
  if (Object.keys(update).length) {
    const { error } = await client.from("workspaces").update(update).eq("id", scope.workspaceId);
    if (error) throw error;
  }
  if (currency) {
    workspaceCurrency = currency;
    const payments = localJson(KEYS.payments, []);
    writeLocal(KEYS.payments, Array.isArray(payments) ? payments.map((payment) => ({ ...payment, currency })) : []);
  }
  return Boolean(currency);
}

export async function clearWorkspacePayments() {
  if (!scope || !client) throw new Error("The workspace is not ready to clear payment records.");
  const { data: existing, error: readError } = await client.from("payments").select("id").eq("workspace_id", scope.workspaceId);
  if (readError) throw readError;
  const { data, error } = await client.from("payments").delete().eq("workspace_id", scope.workspaceId).select("id");
  if (error) throw error;
  const count = data?.length || 0;
  if (count !== (existing || []).length) throw new Error("Some payment records could not be cleared. Check your access and make sure the latest Supabase migration has been run.");
  writeLocal(KEYS.payments, []);
  writeLocal(KEYS.activity, localJson(KEYS.activity, []).filter((item) => item.type !== "payment"));
  return count;
}

export const updateWorkspaceName = (name) => updateWorkspaceSettings({ name });

export async function createWorkspaceInvitation(email, role) {
  const response = await fetch("/api/invitations/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId: scope.workspaceId, email, role: lower(role) }) });
  if (!response.ok) throw new Error((await response.json()).error || "Invitation email could not be sent.");
}

export async function getTeamData() {
  if (!client || !scope) {
    client = createClient();
    const { data: { user } } = await client.auth.getUser();
    const workspaceId = await ensureWorkspace();
    if (!user || !workspaceId) return [];
    scope = { workspaceId, userId: user.id };
    await fetchMembers();
    await fetchLeads();
  }
  const [members, invitations] = await Promise.all([
    client.from("workspace_members").select("user_id,role,status,job_title,profiles(first_name,last_name,email)").eq("workspace_id", scope.workspaceId),
    client.from("invitations").select("id,email,role,expires_at,created_at").eq("workspace_id", scope.workspaceId).is("accepted_at", null),
  ]);
  if (members.error) throw members.error;
  // Non-admin members cannot view invitations under the supplied SQL policies.
  const current = await client.auth.getUser();
  const [leadCounts, taskCounts] = await Promise.all([
    client.from("leads").select("owner_id").eq("workspace_id", scope.workspaceId),
    client.from("tasks").select("owner_id").eq("workspace_id", scope.workspaceId),
  ]);
  const mappedMembers = (members.data || []).map((row) => {
    const profile = row.profiles || {};
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email?.split("@")[0] || "Workspace member";
    return { id: row.user_id, userId: row.user_id, name, email: profile.email || "", role: ({ owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" })[row.role] || "Member", status: row.status === "active" ? "Active" : "Suspended", leads: (leadCounts.data || []).filter((lead) => lead.owner_id === row.user_id).length, tasks: (taskCounts.data || []).filter((task) => task.owner_id === row.user_id).length, initials: name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(), isCurrent: row.user_id === current.data.user?.id };
  });
  const mappedInvitations = (invitations.data || []).map((row) => ({ id: row.id, name: "", email: row.email, role: upper(row.role), status: "Invited", leads: 0, tasks: 0, initials: "", expiresAt: row.expires_at, invitation: true }));
  return [...mappedMembers, ...mappedInvitations];
}

export async function deleteWorkspaceInvitation(invitationId) {
  if (!scope || !client) return;
  const { error } = await client.from("invitations").delete().eq("workspace_id", scope.workspaceId).eq("id", invitationId);
  if (error) throw error;
}

export async function saveAnalysis(item) {
  const { data, error } = await client.from("saved_analyses").insert({ workspace_id: scope.workspaceId, user_id: scope.userId, question: item.question, summary: item.summary || item.result || "", details: item.details || "", metric: item.metric || "" }).select("*").single();
  if (error) throw error;
  return { id: data.id, question: data.question, result: data.summary, metric: data.metric, createdAt: data.created_at };
}

export async function markNotificationRead(id) {
  const { error } = await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", scope.userId);
  dbError(error, "Could not mark notification read:");
}
