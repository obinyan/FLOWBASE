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

const DESTINATIONS = [
  ["Dashboard", "Open the home dashboard and recent activity.", "/dashboard", "home homepage overview summary recent activity"],
  ["Workspace", "Manage your leads, clients, work pipeline, and payment records.", "/workspace", "workspace clients customers pipeline payments services"],
  ["Pipeline", "View service opportunities and move work through its stages.", "/workspace?tab=pipeline", "deals opportunities stages sales board services jobs"],
  ["Leads", "View and manage prospects and follow-ups.", "/workspace?tab=leads", "contacts companies businesses prospects potential"],
  ["Clients", "View current clients and their activity, services, and payment history.", "/workspace?tab=clients", "customers accounts existing service history"],
  ["Payments", "View manual and connected-source payment records.", "/workspace?tab=payments", "money billing transactions paid invoices"],
  ["Calendar", "View meetings, events, and scheduled follow-ups.", "/calendar", "schedule appointments meetings events follow ups"],
  ["Tasks", "View assigned, upcoming, overdue, and completed work.", "/tasks", "to do todo workload assignments due priority completed"],
  ["Reports", "Open lead analytics, pipeline reports, and saved analysis.", "/report", "report analytics insights statistics export"],
  ["Inbox", "Open conversations, messages, and notifications.", "/inbox", "email messages conversations notifications"],
  ["Team", "Manage teammates, invitations, roles, and workload.", "/team", "members invite access roles workload"],
  ["Settings", "Manage your profile, workspace, security, and preferences.", "/settings", "configuration account setup options"],
];

const SETTINGS_GUIDES = [
  ["Edit profile details", "Settings · Profile. Change your name, email, job title, phone number, or profile photo, then save.", "/settings#profile", "profile personal details name email address change update edit phone job title photo avatar picture save"],
  ["Change your profile email", "Settings · Profile. Edit the WORK EMAIL field and select Save changes.", "/settings#profile", "email work email address change update edit profile account login contact"],
  ["Change your profile photo", "Settings · Profile. Upload or remove your profile photo.", "/settings#profile", "photo image avatar upload remove change profile picture"],
  ["Change dark or light mode", "Settings · Preferences. Choose Dark, Light, or System under Appearance.", "/settings#preferences", "preferences preference theme appearance styling style colors dark light mode system change update"],
  ["Change language", "Settings · Preferences. Choose a language in the Language field.", "/settings#preferences", "preferences language localization change update"],
  ["Update workspace name", "Settings · Workspace. Edit the workspace name and save your changes.", "/settings#workspace", "workspace company organization name edit change update"],
  ["Manage password and two-factor security", "Settings · Team & access. Find password and two-factor authentication controls.", "/settings#team-access", "security password two factor authentication 2fa access permissions"],
  ["Change notification preferences", "Settings · Notifications. Choose email updates, weekly digest, and product tips.", "/settings#notifications", "notifications alerts email updates weekly digest product tips preferences"],
  ["Manage integrations", "Settings · Integrations. Review connected services and available integrations.", "/settings#integrations", "integrations connect google outlook calendar contacts email"],
  ["Export or review account data", "Settings · Data & privacy. Find data export and account options.", "/settings#data-privacy", "privacy data export download retention account"],
  ["Create a lead", "Open Leads and choose Add lead to create a contact or company record.", "/leads", "add create new lead contact company business prospect"],
  ["Create a task", "Open Tasks and choose Add task to make a follow-up or assignment.", "/tasks", "add create new task todo follow up assignment work"],
  ["Schedule a calendar event", "Open Calendar and choose Add event to schedule a meeting or follow-up.", "/calendar", "add create schedule calendar event meeting appointment follow up"],
  ["Invite a teammate", "Open Team and choose Invite member to add someone to the workspace.", "/team", "invite add create teammate team member coworker colleague"],
  ["Open your messages", "Open Inbox to view conversations and notifications.", "/inbox", "messages email inbox conversations notifications"],
];

const STOP_WORDS = new Set(["a", "an", "and", "are", "can", "could", "do", "does", "for", "how", "i", "in", "is", "it", "me", "my", "of", "on", "please", "the", "to", "where", "with", "would", "your"]);

export function searchPlatform(rawQuery) {
  if (typeof window === "undefined") return [];
  const terms = String(rawQuery || "").toLowerCase().match(/[a-z0-9@.+_-]+/g)?.filter((term) => !STOP_WORDS.has(term)) || [];
  if (!terms.length) return [];

  const results = [];
  DESTINATIONS.forEach(([title, detail, href, keywords]) => results.push(makeResult("Page", title, detail, href, { title, detail, keywords })));
  SETTINGS_GUIDES.forEach(([title, detail, href, keywords]) => results.push(makeResult("How to", title, detail, href, { title, detail, keywords })));
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
    });
}
