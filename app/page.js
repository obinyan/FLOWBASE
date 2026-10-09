import Link from "next/link";
import Icon from "@/components/Icons";
import { STATS, AGENDA, PRIORITY, ACTIVITY } from "@/lib/data";

export default function Dashboard() {
  return (
    <>
      <section className="panel attention">
        <p>Here’s what needs your attention today</p>
        <div className="attention-actions">
          <Link href="/calendar?view=follow-ups" className="btn-schedule">Schedule follow-ups</Link>
          <Link href="/pipeline" className="btn-pipeline">View pipeline</Link>
        </div>
      </section>

      <section className="stats" aria-label="Summary">
        {STATS.map((s) => (
          <Link key={s.id} href={s.id === "total" ? "/leads" : s.id === "new" ? "/leads?filter=new" : "/calendar?view=follow-ups"}
            className={`panel stat stat-${s.id}`} aria-label={`${s.label}: ${s.value}. Open ${s.id === "total" || s.id === "new" ? "leads" : "follow-ups"}`}>
            {s.id === "total" || s.id === "new" ? (
              <>
                <h2 className="stat-label">{s.label}</h2>
                <div className="stat-value">{s.value}</div>
                <div className="stat-note">
                  {s.trend && <Icon name="trend" size={13} strokeWidth={2} />}
                  {s.note}
                </div>
                {s.icon && <span className="stat-icon"><Icon name={s.icon} size={22} /></span>}
              </>
            ) : (
              <>
                <h2 className="stat-label plain">{s.label}</h2>
                <div className="stat-row">
                  <strong>{s.value}</strong>
                  <span>{s.note}</span>
                </div>
              </>
            )}
          </Link>
        ))}
      </section>

      <div className="mid">
        <section className="panel agenda">
          <div className="card-head">
            <div>
              <h2>Today’s agenda</h2>
              <small>{AGENDA.date}</small>
            </div>
            <Link href="/calendar" className="head-link">View calendar</Link>
          </div>
          <ol className="timeline">
            {AGENDA.items.map((a, i) => (
              <li key={i}>
                <time>{a.time}</time>
                <span className="node" style={{ background: a.color }} />
                <Link href="/calendar" className="agenda-row">
                  <div>
                    <b>{a.title} &nbsp;{a.lead}</b>
                    <small>{a.sub}</small>
                  </div>
                  <span className="tag">{a.tag}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel priority">
          <div className="card-head">
            <div>
              <h2>Priority leads</h2>
              <small>High intent and ready for attention</small>
            </div>
            <Link href="/leads" className="head-link">See all <Icon name="arrow" size={15} /></Link>
          </div>
          <ul className="lead-list">
            {PRIORITY.map((l) => (
              <li key={l.name}>
                <Link href="/leads" className="lead-card">
                  <span className="lead-avatar">{l.initials}</span>
                  <div className="lead-body">
                    <div className="lead-top"><b>{l.name}</b><span className="rating">{l.rating}</span></div>
                    <small>{l.meta}</small>
                    <div className="lead-bottom"><strong>{l.status}</strong><span>{l.when}</span></div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel activity">
        <div className="card-head">
          <div>
            <h2>Recent Activity</h2>
            <small>Latest updates across &nbsp;your leads</small>
          </div>
          <Link href="/activity" className="head-link">Activity log <Icon name="arrow" size={15} /></Link>
        </div>
        <ul className="activity-list">
          {ACTIVITY.map((a, i) => (
            <li key={i}>
              <Link href={i === 0 ? "/leads?filter=new" : i === 1 ? "/leads?status=qualified" : i === 2 ? "/leads?search=Glitz%20N%20Glam" : "/leads?search=Shopkyluxury"}
                className="activity-row" aria-label={`${a.title}: ${a.sub}`}>
                <span className={`act-icon ${a.tone}`}><Icon name={a.icon} size={14} strokeWidth={2} /></span>
                <div className="act-text"><b>{a.title}</b><small>{a.sub}</small></div>
                <time>{a.time}</time>
                </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
