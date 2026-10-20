import { readLeads } from "@/lib/leads";
import { readTasks } from "@/lib/tasks";
import { readInbox } from "@/lib/inbox";

function readArray(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function makeResult(section, title, detail, href, data) {
  return { section, title: String(title || section), detail: String(detail || ""), href, searchable: JSON.stringify(data || {}).toLowerCase() };
}

export function searchPlatform(rawQuery) {
  if (typeof window === "undefined") return [];
  const terms = String(rawQuery || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const results = [];
  const leads = readLeads();
  const tasks = readTasks();
  const inbox = readInbox();
  const calendar = readArray("flowbase:calendar:v2").filter((event) => event && !event.taskId);
  const team = readArray("flowbase:team:v1");
  const settings = (() => {
    const defaults = { firstName: "John", lastName: "Okafor", email: "john@flowbase.io", title: "Sales manager", phone: "+234 801 234 5678", timezone: "Africa/Lagos", workspace: "Flowbase", language: "English" };
    try { return { ...defaults, ...JSON.parse(window.localStorage.getItem("flowbase:settings") || "{}") }; }
    catch { return defaults; }
  })();
  let greeting = "";
  try { greeting = window.localStorage.getItem("flowbase:greeting") || ""; } catch {}
  const history = readArray("flowbase:analysis-history:v1");

  leads.forEach((lead) => results.push(makeResult("Lead", lead.name, `${lead.contact || "Contact"}${lead.stage ? ` · ${lead.stage}` : ""}${lead.email ? ` · ${lead.email}` : ""}`, "/leads", lead)));
  tasks.forEach((task) => results.push(makeResult("Task", task.title, `${task.lead || "No lead"}${task.due ? ` · Due ${task.due}` : ""}${task.completed ? " · Completed" : ""}`, "/tasks", task)));
  calendar.forEach((event) => results.push(makeResult("Calendar", event.title, `${event.date || "No date"}${event.lead ? ` · ${event.lead}` : ""}${event.kind ? ` · ${event.kind}` : ""}`, "/calendar", event)));
  team.forEach((member) => results.push(makeResult("Team", member.name, `${member.role || "Member"}${member.email ? ` · ${member.email}` : ""}`, "/team", member)));
  inbox.messages.forEach((message) => {
    results.push(makeResult("Message", message.name, message.preview || message.detail, "/inbox?view=messages", message));
    (message.messages || []).forEach((item) => results.push(makeResult("Message", `${message.name}: ${item.text}`, item.time || "Conversation", "/inbox?view=messages", item)));
  });
  inbox.notifications.forEach((notification) => results.push(makeResult("Notification", notification.title || notification.text || "Notification", notification.detail || notification.time || "", "/inbox?view=notifications", notification)));
  history.forEach((entry) => results.push(makeResult("Report", entry.question || entry.query || entry.title || "Saved analysis", entry.answer || entry.summary || "Saved report analysis", "/report", entry)));
  results.push(makeResult("Profile & settings", `${settings.firstName || ""} ${settings.lastName || ""}`.trim() || "Profile settings", `${settings.email || ""}${settings.title ? ` · ${settings.title}` : ""}`, "/settings#profile", { ...settings, greeting }));

  return results
    .filter((result) => terms.every((term) => `${result.title} ${result.detail} ${result.section} ${result.searchable}`.toLowerCase().includes(term)))
    .sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aRank = terms.some((term) => aTitle === term) ? 0 : terms.some((term) => aTitle.startsWith(term)) ? 1 : 2;
      const bRank = terms.some((term) => bTitle === term) ? 0 : terms.some((term) => bTitle.startsWith(term)) ? 1 : 2;
      return aRank - bRank;
    })
    .slice(0, 12);
}
