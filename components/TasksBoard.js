"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";
import { localDateKey, readTasks, syncTaskCalendar, taskIsOverdue, writeTasks } from "@/lib/tasks";

const TODAY = localDateKey();
const fmtDate = (key) => key === TODAY ? "Today" : new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function TasksBoard() {
  const [tasks, setTasks] = useState([]);
  const [today, setToday] = useState(TODAY);
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
      const reset = window.localStorage.getItem("flowbase:tasks:demo-reset-v1");
      if (!reset) {
        window.localStorage.removeItem("flowbase:tasks:v1");
        window.localStorage.setItem("flowbase:tasks:demo-reset-v1", "done");
      }
      setTasks(readTasks());
      setToday(localDateKey());
    } catch {}
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;
    writeTasks(tasks);
    syncTaskCalendar(tasks);
  }, [tasks, storageReady]);
  useEffect(() => {
    const refresh = () => { setTasks(readTasks()); setToday(localDateKey()); };
    const timer = window.setInterval(() => setToday(localDateKey()), 60000);
    window.addEventListener("storage", refresh);
    window.addEventListener("flowbase:tasks-updated", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", refresh); window.removeEventListener("flowbase:tasks-updated", refresh); };
  }, []);

  const filtered = useMemo(() => tasks.filter((task) => {
    const term = query.trim().toLowerCase();
    return (!term || `${task.title} ${task.lead} ${task.detail}`.toLowerCase().includes(term))
      && (tab === "All tasks" || task.owner === "You")
      && (priority === "Priority" || task.priority === priority)
      && (!filters.assigned || task.owner === "You")
      && (!filters.due || task.due === today)
      && (!filters.overdue || taskIsOverdue(task, today))
      && (!filters.completed || task.completed);
  }).sort((a, b) => a.due.localeCompare(b.due) || a.time.localeCompare(b.time)), [tasks, query, tab, priority, filters, today]);

  const dueToday = tasks.filter((task) => !task.completed && task.due === today).length;
  const upcoming = tasks.filter((task) => !task.completed && task.due > today).length;
  const overdue = tasks.filter((task) => taskIsOverdue(task, today)).length;
  const completedCount = tasks.filter((task) => task.completed).length;
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
    setTasks((current) => [...current, { ...draft, id: Date.now(), due: draft.date, detail: draft.detail || "Task for this lead", completed: false }]);
    setDraft({ title: "", lead: "", detail: "", priority: "Medium", date: TODAY, time: "10:00", owner: "You" });
    setFormOpen(false);
  };
  const grouped = {
    today: filtered.filter((task) => task.due === today && !task.completed),
    overdue: filtered.filter((task) => taskIsOverdue(task, today)),
    upcoming: filtered.filter((task) => task.due > today && !task.completed),
    completed: filtered.filter((task) => task.completed),
  };
  const todayLabel = new Date(`${today}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const visibleGroups = filters.completed ? [["Completed", grouped.completed]] : [[`Today · ${todayLabel}`, grouped.today], ["Overdue", grouped.overdue], ["Upcoming", grouped.upcoming]];
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
        <span className={`task-time ${taskIsOverdue(task, today) ? "is-overdue" : ""}`}><Icon name="calendar" size={12} />{taskIsOverdue(task, today) ? `Overdue · ${fmtDate(task.due)}` : task.due === today ? task.time : `${fmtDate(task.due)}, ${task.time}`}</span>
        <span className="task-assignee"><i>{task.owner === "You" ? "Y" : task.owner === "John" ? "J" : task.owner === "Ada" ? "A" : "A"}</i>{task.owner}</span>
        <div className="task-menu-wrap"><button type="button" aria-label={`Actions for ${task.title}`} aria-expanded={menuId === task.id} onClick={() => setMenuId(menuId === task.id ? null : task.id)}><Icon name="more" size={18} /></button>{menuId === task.id && <div className="pipeline-popover"><button type="button" onClick={() => { updateTask(task.id, { priority: task.priority === "High" ? "Medium" : "High" }); setMenuId(null); }}>{task.priority === "High" ? "Lower priority" : "Mark high priority"}</button><button type="button" onClick={() => { updateTask(task.id, { owner: task.owner === "You" ? "John" : "You" }); setMenuId(null); }}>{task.owner === "You" ? "Assign to John" : "Assign to me"}</button><button type="button" onClick={() => { updateTask(task.id, { completed: !task.completed }); setMenuId(null); }}>{task.completed ? "Reopen task" : "Mark complete"}</button></div>}</div>
      </article>)}</div></section> : null)}{visibleGroups.every(([, items]) => items.length === 0) && <div className="tasks-empty"><Icon name="tasks" size={26} /><p>No tasks match these filters.</p><button type="button" onClick={() => { setQuery(""); setPriority("Priority"); setFilters({ assigned: false, due: false, overdue: false, completed: false }); }}>Clear filters</button></div>}</div>
    </section>

    <aside className="tasks-focus-panel"><header><h2>Today’s focus</h2><p>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p></header><section className="task-progress-card"><span>DAILY PROGRESS</span><div><b>{completedToday} of {tasks.length} tasks completed</b><strong>{tasks.length ? Math.round(completedToday / tasks.length * 100) : 0}%</strong></div><i><b style={{ width: `${tasks.length ? Math.round(completedToday / tasks.length * 100) : 0}%` }} /></i></section>
      <section className="task-priority-focus"><span>PRIORITY TASK</span>{focusedTask ? <article><b><i />{focusedTask.priority} priority</b><h3>{focusedTask.title}</h3><p>{focusedTask.lead}</p><small>Due today at {focusedTask.time}</small><Link href={`/leads?search=${encodeURIComponent(focusedTask.lead)}`}>Open lead details <Icon name="arrow" size={13} /></Link></article> : <p>All high priority tasks are complete.</p>}</section>
      <section className="task-workload"><span>TEAM WORKLOAD</span>{workload.map(({ owner, count }, index) => <div className="workload-row" key={owner}><i className={`workload-avatar workload-${index}`}>{owner === "You" ? "Y" : owner[0]}</i><div><p><b>{owner}</b><small>{count} tasks</small></p><span><i style={{ width: `${Math.min(22 + count * 12, 92)}%` }} /></span></div></div>)}</section>
      <section className="task-tip"><span>QUICK TIP</span><p>Complete a task to keep its lead moving through the pipeline.</p><button type="button" onClick={() => { setFilters({ assigned: false, due: false, overdue: false, completed: true }); setTab("All tasks"); }}>View completed tasks <Icon name="arrow" size={13} /></button></section>
    </aside></div>

    {formOpen && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section className="pipeline-modal" role="dialog" aria-modal="true" aria-labelledby="new-task-title"><header><div><h2 id="new-task-title">Add a task</h2><p>Give your next action an owner and due date.</p></div><button type="button" aria-label="Close" onClick={() => setFormOpen(false)}><Icon name="close" size={18} /></button></header><form onSubmit={addTask}><label>Task title<input required autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What needs to be done?" /></label><label>Lead or company<input required value={draft.lead} onChange={(event) => setDraft({ ...draft, lead: event.target.value })} placeholder="Lead or company name" /></label><label>Details<input value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} placeholder="Add a short note" /></label><div className="pipeline-modal-fields"><label>Due date<input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Time<input type="time" required value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></label></div><div className="pipeline-modal-fields"><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Assign to<select value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })}><option>You</option><option>John</option><option>Ada</option><option>Amaka</option></select></label></div><footer><button type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="pipeline-add" type="submit"><Icon name="plus" size={15} />Add task</button></footer></form></section></div>}
  </div>;
}
