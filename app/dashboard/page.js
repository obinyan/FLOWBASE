import Link from "next/link";
import Icon from "@/components/Icons";
import { AGENDA, PRIORITY } from "@/lib/data";
import DashboardActivity from "@/components/DashboardActivity";
import DashboardOverview from "@/components/DashboardOverview";

export default function Dashboard() {
  return (
    <>
      <section className="panel attention">
        <p>Here’s what needs your attention today</p>
        <div className="attention-actions">
          <Link href="/calendar?view=follow-ups" className="btn-schedule">Schedule follow-ups</Link>
          <Link href="/workspace" className="btn-pipeline">View workspace</Link>
        </div>
      </section>

      <DashboardOverview />

      <div className="mid">
        <section className="panel agenda">
          <div className="card-head"><div><h2>Today’s agenda</h2><small>{AGENDA.date}</small></div><Link href="/calendar" className="head-link">View calendar</Link></div>
          <ol className="timeline">{AGENDA.items.map((a, i) => (
            <li key={i}><time>{a.time}</time><span className="node" style={{ background: a.color }} /><Link href="/calendar" className="agenda-row"><div><b>{a.title} &nbsp;{a.lead}</b><small>{a.sub}</small></div><span className="tag">{a.tag}</span></Link></li>
          ))}{AGENDA.items.length === 0 && <li className="dashboard-empty"><span className="act-icon indigo"><Icon name="calendar" size={15} /></span><div><b>No follow-ups scheduled</b><small>New activity will appear here when you add leads.</small></div></li>}</ol>
        </section>
        <section className="panel priority">
          <div className="card-head"><div><h2>Priority leads</h2><small>High intent and ready for attention</small></div><Link href="/leads" className="head-link">See all <Icon name="arrow" size={15} /></Link></div>
          <ul className="lead-list">{PRIORITY.map((l) => (
            <li key={l.name}><Link href="/leads" className="lead-card"><span className="lead-avatar">{l.initials}</span><div className="lead-body"><div className="lead-top"><b>{l.name}</b><span className="rating">{l.rating}</span></div><small>{l.meta}</small><div className="lead-bottom"><strong>{l.status}</strong><span>{l.when}</span></div></div></Link></li>
          ))}{PRIORITY.length === 0 && <li className="dashboard-empty"><span className="act-icon teal"><Icon name="leads" size={15} /></span><div><b>No priority leads</b><small>Leads marked for attention will show here.</small></div></li>}</ul>
        </section>
      </div>

      <DashboardActivity />
    </>
  );
}
