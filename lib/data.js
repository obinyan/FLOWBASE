export const NAV = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Pipeline", href: "/pipeline", icon: "pipeline" },
  { label: "Leads", href: "/leads", icon: "leads" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Tasks", href: "/tasks", icon: "tasks" },
  { label: "Report", href: "/report", icon: "report" },
];

export const STATS = [
  { id: "total", label: "TOTAL LEADS", value: "160", note: "All time", icon: "leads" },
  { id: "new", label: "NEW LEADS", value: "16", note: "12% this month", trend: true },
  { id: "due", label: "Follow-ups due today", value: "9", note: "3 need a response" },
  { id: "overdue", label: "Overdue follow-ups", value: "3", note: "Review today" },
];

export const AGENDA = {
  date: "Tuesday, 06 October. 4 items",
  items: [
    { time: "9:30", color: "#9a92d2", title: "Discovery call", lead: "Biba Kulture", sub: "Discuss ecommerce needs  Phone call", tag: "In 20 Min" },
    { time: "9:30", color: "#22c55e", title: "Send revised proposal", lead: "Glitz N Glam", sub: "Attach pricing options and delivery timeline", tag: "Task" },
    { time: "9:30", color: "#3b82f6", title: "Follow-up", lead: "Shopkyluxury Fashion", sub: "WhatsApp  Confirm inventory and payment needs", tag: "Follow up" },
    { time: "9:30", color: "#f5a524", title: "Review overdue lead", lead: "Naya Home", sub: "No response in 5 days  Decide next outreach", tag: "Overdue" },
  ],
};

export const PRIORITY = [
  { initials: "BK", name: "Biba Kulture", rating: "5.0", meta: "Fashion / Retail · Lagos", status: "Qualified", when: "Call 09:30" },
  { initials: "GN", name: "Glitz N Glam", rating: "4.9", meta: "Fashion / Retail · Alimosho", status: "Proposal", when: "Due Today" },
  { initials: "SH", name: "Shopkyluxury", rating: "4.3", meta: "Fashion / Retail · Lagos", status: "Contacted", when: "Today 13:30" },
];

export const ACTIVITY = [
  { icon: "plus", tone: "indigo", title: "New lead added", sub: "Mira Beauty Studio · from Instagram", time: "12 min ago" },
  { icon: "check", tone: "green", title: "Status changed to Qualified", sub: "Biba Kulture · by John", time: "48 min ago" },
  { icon: "note", tone: "teal", title: "Note added after follow-up", sub: "Glitz N Glam · “Requested revised delivery estimate”", time: "2 hours ago" },
  { icon: "clock", tone: "olive", title: "Follow-up completed", sub: "Shopkyluxury Fashion · next step scheduled", time: "Yesterday" },
];
