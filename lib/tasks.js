export const TASKS_KEY = "flowbase:tasks:v2";
export const TASKS_EVENT = "flowbase:tasks-updated";

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const taskIsOverdue = (task, today = localDateKey()) => !task.completed && task.due < today;

export function readTasks() {
  if (typeof window === "undefined") return [];
  try { const items = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); return Array.isArray(items) ? items : []; } catch { return []; }
}

export function writeTasks(tasks) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch {}
  window.dispatchEvent(new Event(TASKS_EVENT));
}

export function syncTaskCalendar(tasks, calendarEvents) {
  if (typeof window === "undefined") return;
  try {
    const existing = calendarEvents || JSON.parse(localStorage.getItem("flowbase:calendar:v2") || "[]");
    const taskEvents = tasks.filter((task) => task && !task.completed).map((task) => ({ id: `task-${task.id}`, date: task.due, time: task.time || "09:00", title: task.title, lead: task.lead, description: task.detail || "Task for this lead", kind: "Task", owner: task.owner, taskId: task.id }));
    const otherEvents = Array.isArray(existing) ? existing.filter((event) => event && !event.taskId && !String(event.id).startsWith("task-")) : [];
    localStorage.setItem("flowbase:calendar:v2", JSON.stringify([...otherEvents, ...taskEvents]));
    window.dispatchEvent(new Event("flowbase:calendar-updated"));
  } catch {}
}
