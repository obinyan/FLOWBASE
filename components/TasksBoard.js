"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";

const TODAY = "2026-10-16";
const TASK_SEED = [
  { title: "Send revised proposal", lead: "Glitz N Glam", detail: "Attach pricing options and delivery timeline", priority: "High", time: "09:30 AM", owner: "John", due: TODAY },
  { title: "Discovery call", lead: "Biba Kulture", detail: "Discuss ecommerce needs", priority: "High", time: "10:00 AM", owner: "You", due: TODAY },
  { title: "Confirm inventory and payment", lead: "Shopkyluxury", detail: "WhatsApp follow-up", priority: "Medium", time: "01:30 PM", owner: "You", due: TODAY },
  { title: "Review overdue lead", lead: "Naya Home", detail: "No response in 5 days", priority: "Urgent", time: "03:00 PM", owner: "John", due: TODAY },
  { title: "Confirm delivery estimate", lead: "Lush Skin Co.", detail: "Send the updated delivery estimate", priority: "Medium", time: "04:00 PM", owner: "You", due: TODAY, overdue: true },
  { title: "Share revised invoice", lead: "Ola Essentials", detail: "Invoice is waiting for review", priority: "Medium", time: "04:30 PM", owner: "Amaka", due: TODAY, overdue: true },
  { title: "Follow up on quotation", lead: "Kora Living", detail: "Confirm the quote was received", priority: "Low", time: "05:00 PM", owner: "John", due: TODAY },
  { title: "Update lead notes", lead: "Mira Beauty Studio", detail: "Add notes from the last conversation", priority: "Medium", time: "05:30 PM", owner: "You", due: TODAY, overdue: true },
  { title: "Prepare onboarding notes", lead: "Kora Living", detail: "New client handoff", priority: "Low", time: "10:00 AM", owner: "You", due: "2026-10-17" },
  { title: "Share revised estimate", lead: "Lush Skin Co.", detail: "Follow-up by email", priority: "Medium", time: "01:30 PM", owner: "John", due: "2026-10-18" },
  { title: "Check in on proposal", lead: "Mira Beauty Studio", detail: "Confirm decision date", priority: "Medium", time: "11:00 AM", owner: "You", due: "2026-10-19" },
  { title: "Send product catalogue", lead: "Adorn Lagos", detail: "Share current product catalogue", priority: "Low", time: "02:00 PM", owner: "Amaka", due: "2026-10-20" },
  { title: "Schedule next conversation", lead: "Soko Home", detail: "Find a suitable time for a call", priority: "Medium", time: "09:30 AM", owner: "Ada", due: "2026-10-21" },
  { title: "Review updated requirements", lead: "The Loom House", detail: "Prepare notes for the review", priority: "Low", time: "10:00 AM", owner: "John", due: "2026-10-22" },
  { title: "Send service agreement", lead: "Biba Kulture", detail: "Share the agreement for review", priority: "High", time: "11:30 AM", owner: "You", due: "2026-10-23" },
  { title: "Confirm meeting attendees", lead: "Glitz N Glam", detail: "Check who will join the meeting", priority: "Low", time: "03:00 PM", owner: "Amaka", due: "2026-10-24" },
  { title: "Prepare campaign summary", lead: "Mira Beauty Studio", detail: "Summarize campaign requirements", priority: "Medium", time: "10:00 AM", owner: "John", due: "2026-10-25" },
  { title: "Follow up on sample order", lead: "Shopkyluxury", detail: "Confirm sample order status", priority: "Medium", time: "01:00 PM", owner: "Ada", due: "2026-10-26" },
  { title: "Send revised scope", lead: "Naya Home", detail: "Include the agreed changes", priority: "High", time: "09:00 AM", owner: "You", due: "2026-10-27" },
  { title: "Review final pricing", lead: "Ola Essentials", detail: "Check final pricing before sending", priority: "Medium", time: "02:30 PM", owner: "Amaka", due: "2026-10-28" },
  { title: "Confirm next steps", lead: "Kora Living", detail: "Agree the next delivery milestone", priority: "Low", time: "10:30 AM", owner: "You", due: "2026-10-29" },
  { title: "Book a product walkthrough", lead: "Lush Skin Co.", detail: "Arrange a product walkthrough", priority: "Medium", time: "11:00 AM", owner: "Ada", due: "2026-10-30" },
  { title: "Update contact details", lead: "Adorn Lagos", detail: "Check contact and billing details", priority: "Low", time: "03:30 PM", owner: "Amaka", due: "2026-10-31" },
  { title: "Prepare monthly review", lead: "Glitz N Glam", detail: "Gather results for the monthly review", priority: "Medium", time: "09:30 AM", owner: "John", due: "2026-11-01" },
  { title: "Draft renewal options", lead: "Biba Kulture", detail: "Prepare renewal options", priority: "High", time: "01:30 PM", owner: "Ada", due: "2026-11-02" },
  { title: "Send thank-you note", lead: "Kora Living", detail: "Thank them for the project kickoff", priority: "Low", time: "10:00 AM", owner: "You", due: "2026-10-15", completed: true, seedCompleted: true },
  { title: "Share call summary", lead: "Mira Beauty Studio", detail: "Send a recap of the discovery call", priority: "Medium", time: "02:00 PM", owner: "John", due: "2026-10-14", completed: true, seedCompleted: true },
];
const fmtDate = (key) => key === TODAY ? "Today" : new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function TasksBoard() {
  const [tasks, setTasks] = useState(() => TASK_SEED.map((task, index) => ({ ...task, id: index + 1, completed: Boolean(task.completed) })));
  const [storageReady, setStorageReady] = useState(false);
  const [tab, setTab] = useState("My tasks");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("Priority");
  const [filters, setFilters] = useState({ assigned: false, due: false, overdue: false, completed: false });
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", lead: "", detail: "", priority: "Medium", date: TODAY, time: "10:00", owner: "You" });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("flowbase:tasks:v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setTasks(parsed);
      }
    } catch {}
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;
    try { window.localStorage.setItem("flowbase:tasks:v1", JSON.stringify(tasks)); } catch {}
  }, [tasks, storageReady]);

  const filtered = useMemo(() => tasks.filter((task) => {
    const term = query.trim().toLowerCase();
    return (!term || `${task.title} ${task.lead} ${task.detail}`.toLowerCase().includes(term))
      && (tab === "All tasks" || task.owner === "You")
      && (priority === "Priority" || task.priority === priority)
      && (!filters.assigned || task.owner === "You")
      && (!filters.due || task.due === TODAY)
      && (!filters.overdue || task.overdue)
      && (!filters.completed || task.completed);
  }).sort((a, b) => a.due.localeCompare(b.due) || a.time.localeCompare(b.time)), [tasks, query, tab, priority, filters]);

  const dueToday = tasks.filter((task) => !task.completed && task.due === TODAY).length;
  const upcoming = tasks.filter((task) => !task.completed && task.due > TODAY).length;
  const overdue = tasks.filter((task) => !task.completed && task.overdue).length;
  const completedCount = 32 + tasks.filter((task) => task.completed && !task.seedCompleted).length;
  const myActiveCount = tasks.filter((task) => task.owner === "You" && !task.completed).length;
  const allActiveCount = tasks.filter((task) => !task.completed).length;
  const completedToday = tasks.filter((task) => task.completed && task.due === TODAY).length;
  const priorityTasks = tasks.filter((task) => !task.completed && ["High", "Urgent"].includes(task.priority));
  const focusedTask = priorityTasks[0];
  const toggleFilter = (name) => setFilters((current) => ({ ...current, [name]: !current[name] }));
  const updateTask = (id, change) => setTasks((current) => current.map((task) => task.id === id ? { ...task, ...change } : task));
  const addTask = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.lead.trim()) return;
    setTasks((current) => [...current, { ...draft, id: Date.now(), due: draft.date, detail: draft.detail || "Task for this lead", completed: false, overdue: false }]);
    setDraft({ title: "", lead: "", detail: "", priority: "Medium", date: TODAY, time: "10:00", owner: "You" });
    setFormOpen(false);
  };
  const grouped = {
    today: filtered.filter((task) => task.due === TODAY && !task.completed),
    overdue: filtered.filter((task) => task.overdue && task.due !== TODAY && !task.completed),
    upcoming: filtered.filter((task) => task.due > TODAY && !task.completed),
    completed: filtered.filter((task) => task.completed),
  };
  const visibleGroups = filters.completed ? [["Completed", grouped.completed]] : [["Today · Friday, Oct 16", grouped.today], ["Overdue", grouped.overdue], ["Upcoming", grouped.upcoming]];
  const workload = ["You", "John", "Amaka"].map((owner) => ({ owner, count: tasks.filter((task) => task.owner === owner && !task.completed).length }));

  return <div className="tasks-page">
    <section className="tasks-heading panel"><div><h1>Tasks</h1><p>Keep important follow-ups moving, one action at a time.</p></div><div className="tasks-heading-actions"><label className="tasks-top-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search tasks" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><Icon name="close" size={14} /></button>}</label><button type="button" className="tasks-add-button" onClick={() => setFormOpen(true)}><Icon name="plus" size={16} />Add task</button></div></section>

    <section className="tasks-overview"><div className="tasks-overview-title"><span>WORK MANAGEMENT</span><h2>Make every next step count</h2><p>Prioritize work across your leads and team.</p></div><div className="tasks-stats">
      <button type="button" className="tasks-stat" style={{ "--task-stat-color": "#9b82ff" }} onClick={() => { setTab("All tasks"); setFilters({ assigned: false, due: true, overdue: false, completed: false }); }}><span>DUE TODAY</span><strong>{dueToday}</strong><small>{priorityTasks.filter((task) => task.due === TODAY).length} high priority</small></button>
      <button type="button" className="tasks-stat" style={{ "--task-stat-color": "#58c8f0" }} onClick={() => { setTab("All tasks"); setFilters({ assigned: false, due: false, overdue: false, completed: false }); setPriority("Priority"); }}><span>UPCOMING</span><strong>{upcoming}</strong><small>Next 7 days</small></button>
      <button type="button" className="tasks-stat" style={{ "--task-stat-color": "#f4bb4d" }} onClick={() => { setPriority("Priority"); setFilters({ assigned: false, due: false, overdue: true, completed: false }); setTab("All tasks"); }}><span>OVERDUE</span><strong>{overdue}</strong><small>Needs attention</small></button>
      <button type="button" className="tasks-stat" style={{ "--task-stat-color": "#53d5aa" }} onClick={() => { setPriority("Priority"); setFilters({ assigned: false, due: false, overdue: false, completed: true }); setTab("All tasks"); }}><span>COMPLETED</span><strong>{completedCount}</strong><small>This month</small></button>
    </div></section>

    <div className="tasks-content-grid"><section className="tasks-list-panel">
      <div className="tasks-toolbar"><div className="tasks-tabs"><button type="button" className={tab === "My tasks" ? "active" : ""} onClick={() => setTab("My tasks")}>My tasks <b>{myActiveCount}</b></button><button type="button" className={tab === "All tasks" ? "active" : ""} onClick={() => setTab("All tasks")}>All tasks <b>{allActiveCount}</b></button></div>
        <label className="tasks-list-search"><Icon name="search" size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks or leads" aria-label="Search tasks or leads" /></label>
        <label className="tasks-priority-select"><select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority"><option>Priority</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select><Icon name="chevron" size={13} /></label>
        <div className="tasks-filter-wrap"><button type="button" className={Object.values(filters).some(Boolean) ? "active" : ""} onClick={() => setFilterOpen((value) => !value)} aria-expanded={filterOpen}><Icon name="filter" size={14} />Filter</button>{filterOpen && <div className="tasks-filter-menu"><label><input type="checkbox" checked={filters.assigned} onChange={() => toggleFilter("assigned")} />Assigned to me</label><label><input type="checkbox" checked={filters.due} onChange={() => toggleFilter("due")} />Due today</label><label><input type="checkbox" checked={filters.overdue} onChange={() => toggleFilter("overdue")} />Overdue</label><label><input type="checkbox" checked={filters.completed} onChange={() => toggleFilter("completed")} />Completed</label><button type="button" onClick={() => setFilters({ assigned: false, due: false, overdue: false, completed: false })}>Clear filters</button></div>}</div>
      </div>
      <div className="tasks-groups">{visibleGroups.map(([group, items]) => items.length ? <section className="task-group" key={group}><header><h3>{group.toUpperCase()}</h3><span>{items.length}</span></header><div className="task-rows">{items.map((task) => <article key={task.id} className={`task-row ${task.completed ? "is-completed" : ""}`}>
        <label className="task-check"><input type="checkbox" checked={task.completed} onChange={() => updateTask(task.id, { completed: !task.completed })} aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`} /><span /></label>
        <Link href={`/leads?search=${encodeURIComponent(task.lead)}`} className="task-description"><b>{task.title}</b><small>{task.lead} · {task.detail}</small></Link>
        <span className={`task-priority-badge ${task.priority.toLowerCase()}`}><i />{task.priority}</span>
        <span className="task-time"><Icon name="calendar" size={12} />{task.due === TODAY ? task.time : `${fmtDate(task.due)}, ${task.time}`}</span>
        <span className="task-assignee"><i>{task.owner === "You" ? "Y" : task.owner === "John" ? "J" : task.owner === "Ada" ? "A" : "A"}</i>{task.owner}</span>
        <div className="task-menu-wrap"><button type="button" aria-label={`Actions for ${task.title}`} aria-expanded={menuId === task.id} onClick={() => setMenuId(menuId === task.id ? null : task.id)}><Icon name="more" size={18} /></button>{menuId === task.id && <div className="pipeline-popover"><button type="button" onClick={() => { updateTask(task.id, { priority: task.priority === "High" ? "Medium" : "High" }); setMenuId(null); }}>{task.priority === "High" ? "Lower priority" : "Mark high priority"}</button><button type="button" onClick={() => { updateTask(task.id, { owner: task.owner === "You" ? "John" : "You" }); setMenuId(null); }}>{task.owner === "You" ? "Assign to John" : "Assign to me"}</button><button type="button" onClick={() => { updateTask(task.id, { completed: !task.completed }); setMenuId(null); }}>{task.completed ? "Reopen task" : "Mark complete"}</button></div>}</div>
      </article>)}</div></section> : null)}{visibleGroups.every(([, items]) => items.length === 0) && <div className="tasks-empty"><Icon name="tasks" size={26} /><p>No tasks match these filters.</p><button type="button" onClick={() => { setQuery(""); setPriority("Priority"); setFilters({ assigned: false, due: false, overdue: false, completed: false }); }}>Clear filters</button></div>}</div>
    </section>

    <aside className="tasks-focus-panel"><header><h2>Today’s focus</h2><p>Friday, October 16</p></header><section className="task-progress-card"><span>DAILY PROGRESS</span><div><b>{Math.min(5 + completedToday, 8)} of 8 tasks completed</b><strong>{Math.min(62 + completedToday * 12, 100)}%</strong></div><i><b style={{ width: `${Math.min(62 + completedToday * 12, 100)}%` }} /></i></section>
      <section className="task-priority-focus"><span>PRIORITY TASK</span>{focusedTask ? <article><b><i />{focusedTask.priority} priority</b><h3>{focusedTask.title}</h3><p>{focusedTask.lead}</p><small>Due today at {focusedTask.time}</small><Link href={`/leads?search=${encodeURIComponent(focusedTask.lead)}`}>Open lead details <Icon name="arrow" size={13} /></Link></article> : <p>All high priority tasks are complete.</p>}</section>
      <section className="task-workload"><span>TEAM WORKLOAD</span>{workload.map(({ owner, count }, index) => <div className="workload-row" key={owner}><i className={`workload-avatar workload-${index}`}>{owner === "You" ? "Y" : owner[0]}</i><div><p><b>{owner}</b><small>{count} tasks</small></p><span><i style={{ width: `${Math.min(22 + count * 12, 92)}%` }} /></span></div></div>)}</section>
      <section className="task-tip"><span>QUICK TIP</span><p>Complete a task to keep its lead moving through the pipeline.</p><button type="button" onClick={() => { setFilters({ assigned: false, due: false, overdue: false, completed: true }); setTab("All tasks"); }}>View completed tasks <Icon name="arrow" size={13} /></button></section>
    </aside></div>

    {formOpen && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section className="pipeline-modal" role="dialog" aria-modal="true" aria-labelledby="new-task-title"><header><div><h2 id="new-task-title">Add a task</h2><p>Give your next action an owner and due date.</p></div><button type="button" aria-label="Close" onClick={() => setFormOpen(false)}><Icon name="close" size={18} /></button></header><form onSubmit={addTask}><label>Task title<input required autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What needs to be done?" /></label><label>Lead or company<input required value={draft.lead} onChange={(event) => setDraft({ ...draft, lead: event.target.value })} placeholder="Lead or company name" /></label><label>Details<input value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} placeholder="Add a short note" /></label><div className="pipeline-modal-fields"><label>Due date<input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Time<input type="time" required value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></label></div><div className="pipeline-modal-fields"><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Assign to<select value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })}><option>You</option><option>John</option><option>Ada</option><option>Amaka</option></select></label></div><footer><button type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="pipeline-add" type="submit"><Icon name="plus" size={15} />Add task</button></footer></form></section></div>}
  </div>;
}
