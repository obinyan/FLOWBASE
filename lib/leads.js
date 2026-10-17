export const LEADS_KEY = "flowbase:leads:v2";
export const LEADS_EVENT = "flowbase:leads-updated";
export const ADD_LEAD_EVENT = "flowbase:open-add-lead";

export function readLeads() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(LEADS_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

export function writeLeads(leads) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads)); } catch {}
  window.dispatchEvent(new Event(LEADS_EVENT));
}

export function createLead(details) {
  const name = (details.businessName || "").trim();
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return {
    ...details,
    id: Date.now(), name, contact: details.contactName || "New contact", initials,
    value: Number(details.value) || 0, stage: details.stage || "New", source: details.source || "Other",
    owner: details.owner || "You",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    followUp: details.followUpDate ? new Date(`${details.followUpDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Not scheduled",
    priority: Boolean(details.priority),
  };
}
