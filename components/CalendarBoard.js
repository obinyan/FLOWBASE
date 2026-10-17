"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icons";
import { localDateKey, readTasks, syncTaskCalendar, taskIsOverdue, TASKS_EVENT } from "@/lib/tasks";

const COLORS = { Call: "#58c8f0", "Follow-up": "#9b82ff", Proposal: "#f4bb4d", Review: "#f4bb4d", Task: "#f4bb4d" };
const CALENDAR_KEY = "flowbase:calendar:v2";
const TODAY = localDateKey();
const pad = (value) => String(value).padStart(2, "0");
const toKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
const dateLabel = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const timeLabel = (time) => {
  const [clock, period] = String(time || "").trim().split(/\s+/);
  const [rawHour, rawMinute] = clock.split(":").map(Number);
  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) return time;
  const hour = period ? rawHour % 12 + (period.toUpperCase() === "PM" ? 12 : 0) : rawHour;
  return `${pad(hour % 12 || 12)}:${pad(rawMinute)} ${hour >= 12 ? "PM" : "AM"}`;
};

function readCalendarEvents() {
  let savedEvents = [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CALENDAR_KEY) || "[]");
    if (Array.isArray(parsed)) savedEvents = parsed.filter((event) => event && !event.taskId && !String(event.id).startsWith("task-"));
  } catch {}
  const taskEvents = readTasks().filter((task) => task && !task.completed).map((task) => ({
    id: `task-${task.id}`,
    taskId: task.id,
    date: task.due,
    time: task.time || "09:00",
    title: task.title,
    lead: task.lead,
    description: task.detail || "Task for this lead",
    kind: "Task",
    owner: task.owner,
    overdue: taskIsOverdue(task),
  }));
  return [...savedEvents, ...taskEvents];
}

export default function CalendarBoard() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [displayDate, setDisplayDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState("Month");
  const [filters, setFilters] = useState({ mine: false, followups: false, overdue: false });
  const [query, setQuery] = useState("");
  const [eventMenu, setEventMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", lead: "", description: "", date: TODAY, time: "10:00", kind: "Call", owner: "John" });

  useEffect(() => {
    const refreshEvents = () => setEvents(readCalendarEvents());
    const refreshStorage = (event) => {
      if (!event.key || event.key === CALENDAR_KEY || event.key === "flowbase:tasks:v2") refreshEvents();
    };
    refreshEvents();
    window.addEventListener(TASKS_EVENT, refreshEvents);
    window.addEventListener("flowbase:calendar-updated", refreshEvents);
    window.addEventListener("storage", refreshStorage);
    return () => {
      window.removeEventListener(TASKS_EVENT, refreshEvents);
      window.removeEventListener("flowbase:calendar-updated", refreshEvents);
      window.removeEventListener("storage", refreshStorage);
    };
  }, []);

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const monthTitle = displayDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const visibleEvents = useMemo(() => events.filter((event) => {
    const term = query.trim().toLowerCase();
    return (!term || `${event.title} ${event.lead} ${event.description} ${event.kind}`.toLowerCase().includes(term))
      && (!filters.mine || event.owner === "John")
      && (!filters.followups || event.kind === "Follow-up")
      && (!filters.overdue || event.overdue);
  }), [events, query, filters]);
  const selectedEvents = visibleEvents.filter((event) => event.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const todayEvents = visibleEvents.filter((event) => event.date === TODAY);
  const followupCount = events.filter((event) => event.kind === "Follow-up").length;
  const overdueCount = events.filter((event) => event.overdue).length;

  const gridDates = useMemo(() => {
    if (view === "Week") {
      const chosen = new Date(`${selectedDate}T12:00:00`);
      const start = new Date(chosen);
      start.setDate(chosen.getDate() - chosen.getDay());
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return { key: toKey(date.getFullYear(), date.getMonth(), date.getDate()), day: date.getDate(), inMonth: date.getMonth() === month };
      });
    }
    const startOffset = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: Math.ceil((startOffset + count) / 7) * 7 }, (_, index) => {
      const day = index - startOffset + 1;
      const date = new Date(year, month, day);
      return { key: toKey(date.getFullYear(), date.getMonth(), date.getDate()), day: date.getDate(), inMonth: date.getMonth() === month };
    });
  }, [view, selectedDate, year, month]);

  const changeMonth = (amount) => {
    if (view === "Week") {
      const next = new Date(`${selectedDate}T12:00:00`);
      next.setDate(next.getDate() + amount * 7);
      const key = toKey(next.getFullYear(), next.getMonth(), next.getDate());
      setSelectedDate(key);
      setDisplayDate(new Date(next.getFullYear(), next.getMonth(), 1));
      return;
    }
    setDisplayDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };
  const goToday = () => { setSelectedDate(TODAY); setDisplayDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); };
  const toggleFilter = (name) => setFilters((current) => ({ ...current, [name]: !current[name] }));
  const openAddEvent = (date = selectedDate) => { setDraft((current) => ({ ...current, date })); setModalOpen(true); };
  const addEvent = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.lead.trim()) return;
    const added = { ...draft, id: Date.now(), overdue: false };
    const nextEvents = [...events, added];
    setEvents(nextEvents);
    syncTaskCalendar(readTasks(), nextEvents);
    setSelectedDate(draft.date);
    const eventDate = new Date(`${draft.date}T12:00:00`);
    setDisplayDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    setModalOpen(false);
    setDraft((current) => ({ ...current, title: "", lead: "", description: "" }));
  };
  const removeEvent = (id) => {
    const nextEvents = events.filter((event) => event.id !== id);
    setEvents(nextEvents);
    syncTaskCalendar(readTasks(), nextEvents);
    setEventMenu(false);
  };

  return <div className="calendar-page">
    <section className="calendar-heading panel"><div><h1>Calendar</h1><p>Plan follow-ups and keep every conversation on track.</p></div><div className="calendar-heading-actions"><label className="calendar-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search events" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label><button className="calendar-add" type="button" onClick={() => openAddEvent()}><Icon name="plus" size={16} />Add event</button></div></section>

    <div className="calendar-section-header"><div><span className="calendar-eyebrow">SCHEDULE</span><h2>Your week, clearly planned</h2><p>A calm view of calls, tasks, and the next follow-up.</p></div><div className="calendar-summary"><button type="button" onClick={goToday}><i className="today-dot" /><span><small>TODAY</small><b>{todayEvents.length} events</b></span></button><button type="button" className={filters.followups ? "active" : ""} onClick={() => toggleFilter("followups")}><i className="followup-dot" /><span><small>FOLLOW-UPS</small><b>{followupCount} due</b></span></button><button type="button" className={filters.overdue ? "active" : ""} onClick={() => toggleFilter("overdue")}><i className="overdue-dot" /><span><small>OVERDUE</small><b>{overdueCount} need attention</b></span></button></div></div>

    <div className="calendar-board-filters"><span>QUICK FILTERS</span><button type="button" className={filters.mine ? "active" : ""} onClick={() => toggleFilter("mine")}><i />My events</button><button type="button" className={filters.followups ? "active" : ""} onClick={() => toggleFilter("followups")}><i />Follow-ups</button><button type="button" className={filters.overdue ? "active" : ""} onClick={() => toggleFilter("overdue")}><i />Overdue</button>{(filters.mine || filters.followups || filters.overdue) && <button type="button" className="calendar-clear-filters" onClick={() => setFilters({ mine: false, followups: false, overdue: false })}>Clear filters</button>}</div>

    <div className="calendar-content-grid"><section className="calendar-month-panel">
      <header className="calendar-controls"><div className="calendar-month-controls"><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><Icon name="chevron" size={16} className="calendar-left" /></button><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><Icon name="chevron" size={16} className="calendar-right" /></button><h3>{view === "Month" ? monthTitle : `Week of ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}</h3><button type="button" className="calendar-today-button" onClick={goToday}>Today</button></div><div className="calendar-view-switch"><button type="button" className={view === "Month" ? "active" : ""} onClick={() => setView("Month")}>Month</button><button type="button" className={view === "Week" ? "active" : ""} onClick={() => setView("Week")}>Week</button></div></header>
      <div className="calendar-grid"><div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className={`calendar-days ${view === "Week" ? "week-view" : ""}`}>{gridDates.map((date) => {
        const dayEvents = visibleEvents.filter((event) => event.date === date.key).sort((a, b) => a.time.localeCompare(b.time));
        return <button type="button" key={date.key} className={`calendar-day ${!date.inMonth ? "outside" : ""} ${selectedDate === date.key ? "selected" : ""} ${TODAY === date.key ? "is-today" : ""}`} onClick={() => { setSelectedDate(date.key); if (!date.inMonth) { const picked = new Date(`${date.key}T12:00:00`); setDisplayDate(new Date(picked.getFullYear(), picked.getMonth(), 1)); } }}><span className="calendar-date-number">{date.day}</span><span className="calendar-day-events">{dayEvents.slice(0, 3).map((event) => <span key={event.id} className="calendar-event-chip" style={{ "--event-color": COLORS[event.kind] || COLORS.Task }} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedDate(date.key); if (!date.inMonth) { const picked = new Date(`${date.key}T12:00:00`); setDisplayDate(new Date(picked.getFullYear(), picked.getMonth(), 1)); } }}><b>{timeLabel(event.time)}</b><span>{event.title} · {event.lead}</span></span>)}{dayEvents.length > 3 && <small className="calendar-more-events">+{dayEvents.length - 3} more</small>}</span><span className="calendar-day-add" onClick={(clickEvent) => { clickEvent.stopPropagation(); openAddEvent(date.key); }}><Icon name="plus" size={12} /></span></button>;
      })}</div></div>
      <footer className="calendar-legend"><span><i className="call-dot" />Calls</span><span><i className="followup-dot" />Follow-ups</span><span><i className="overdue-dot" />Tasks / reviews</span></footer>
    </section>

    <aside className="calendar-agenda"><header className="agenda-panel-heading"><div><h3>{dateLabel(selectedDate)}</h3><p>{selectedEvents.length} events scheduled</p></div><div className="calendar-agenda-menu"><button type="button" aria-label="Event options" aria-expanded={eventMenu} onClick={() => setEventMenu((value) => !value)}><Icon name="more" size={19} /></button>{eventMenu && <div className="pipeline-popover"><button type="button" onClick={() => openAddEvent()}>Add event</button><button type="button" onClick={() => { setFilters({ mine: false, followups: false, overdue: false }); setQuery(""); setEventMenu(false); }}>Clear filters</button></div>}</div></header>
      <div className="calendar-agenda-list">{selectedEvents.length ? selectedEvents.map((event) => <article className="calendar-agenda-event" key={event.id} style={{ "--event-color": COLORS[event.kind] || COLORS.Task }}><time>{timeLabel(event.time)}</time><i className="agenda-event-dot" /><div className="agenda-event-info"><b>{event.title}</b><span>{event.lead}</span><small>{event.description}</small></div><span className="agenda-event-tag">{event.overdue ? "Overdue" : event.kind === "Call" ? "Call" : event.kind === "Follow-up" ? "Follow-up" : "Task"}</span>{event.overdue && !event.taskId && <button className="agenda-event-remove" type="button" onClick={() => removeEvent(event.id)} aria-label={`Remove ${event.title}`}><Icon name="close" size={13} /></button>}</article>) : <div className="calendar-empty"><Icon name="calendar" size={25} /><p>No events scheduled for this day.</p><button type="button" onClick={() => openAddEvent()}>Add an event</button></div>}</div>
      <div className="calendar-up-next"><span>UP NEXT</span>{(() => { const next = visibleEvents.filter((event) => event.date > selectedDate).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0]; return next ? <article><strong>{new Date(`${next.date}T12:00:00`).getDate()}<small>{new Date(`${next.date}T12:00:00`).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</small></strong><div><b>{next.lead} · {next.title}</b><span>{next.description}</span><small>Owner: {next.owner}</small></div></article> : <p>No upcoming events.</p>; })()}<button type="button" className="calendar-schedule-button" onClick={() => { setView("Week"); const next = visibleEvents.filter((event) => event.date > selectedDate).sort((a, b) => a.date.localeCompare(b.date))[0]; if (next) setSelectedDate(next.date); }}>Open full schedule <Icon name="arrow" size={14} /></button></div>
    </aside></div>

    {modalOpen && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><section className="pipeline-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-event-title"><header><div><h2 id="calendar-event-title">Add an event</h2><p>Schedule a call, task, or follow-up.</p></div><button type="button" aria-label="Close" onClick={() => setModalOpen(false)}><Icon name="close" size={18} /></button></header><form onSubmit={addEvent}><label>Event title<input required autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Discovery call" /></label><label>Lead or contact<input required value={draft.lead} onChange={(event) => setDraft({ ...draft, lead: event.target.value })} placeholder="Name or company" /></label><label>Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What needs to happen?" /></label><div className="pipeline-modal-fields"><label>Date<input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Time<input type="time" required value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></label></div><div className="pipeline-modal-fields"><label>Event type<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value, title: draft.title || event.target.value })}><option>Call</option><option>Follow-up</option><option>Proposal</option><option>Review</option><option>Task</option></select></label><label>Owner<select value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })}><option>John</option><option>Ada</option></select></label></div><footer><button type="button" onClick={() => setModalOpen(false)}>Cancel</button><button className="pipeline-add" type="submit"><Icon name="plus" size={15} />Add event</button></footer></form></section></div>}
  </div>;
}
