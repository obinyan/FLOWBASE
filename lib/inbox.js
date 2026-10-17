export const INBOX_KEY = "flowbase:inbox:v1";

const DEMO_MESSAGE_IDS = new Set(["biba", "glitz", "mira", "shop", "naya", "lush"]);
const DEMO_NOTIFICATION_IDS = new Set([1, 2, 3, 4, 5, 6]);

export function readInbox() {
  if (typeof window === "undefined") return { messages: [], notifications: [] };

  try {
    const saved = JSON.parse(window.localStorage.getItem(INBOX_KEY) || "{}");
    const messages = Array.isArray(saved.messages) ? saved.messages.filter((item) => item && !DEMO_MESSAGE_IDS.has(item.id)) : [];
    const notifications = Array.isArray(saved.notifications) ? saved.notifications.filter((item) => item && !DEMO_NOTIFICATION_IDS.has(item.id)) : [];
    if (messages.length !== (saved.messages || []).length || notifications.length !== (saved.notifications || []).length) {
      try { window.localStorage.setItem(INBOX_KEY, JSON.stringify({ messages, notifications })); } catch {}
    }
    return { messages, notifications };
  } catch {
    return { messages: [], notifications: [] };
  }
}
