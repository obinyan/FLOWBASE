"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";

const INITIAL_LEADS = [
  { id: 1, name: "Mira Beauty Studio", contact: "Mira Okafor", initials: "MO", value: 2400, source: "Instagram", stage: "New", date: "Today", owner: "John" },
  { id: 2, name: "Naya Home", contact: "Naya Bello", initials: "NH", value: 1800, source: "Website", stage: "New", date: "Yesterday", owner: "John" },
  { id: 3, name: "Kora Living", contact: "Tomi Adebayo", initials: "KL", value: 1250, source: "Referral", stage: "New", date: "Oct 10", owner: "Ada" },
  { id: 4, name: "Glitz N Glam", contact: "Tolu James", initials: "GN", value: 3600, source: "Instagram", stage: "Contacted", date: "Today", owner: "Ada" },
  { id: 5, name: "Lush Skin Co.", contact: "Amaka Obi", initials: "LS", value: 2100, source: "Referral", stage: "Contacted", date: "Oct 14", owner: "John" },
  { id: 6, name: "Ola Essentials", contact: "Feyi Ade", initials: "OE", value: 1950, source: "Website", stage: "Contacted", date: "Oct 13", owner: "Ada" },
  { id: 7, name: "Biba Kulture", contact: "Biba Kalu", initials: "BK", value: 5000, source: "Instagram", stage: "Qualified", date: "Today", owner: "John" },
  { id: 8, name: "Shopkyluxury", contact: "Kemi Ayo", initials: "SK", value: 4250, source: "Referral", stage: "Qualified", date: "Oct 15", owner: "Ada" },
  { id: 9, name: "Soko Home", contact: "Lara Musa", initials: "SH", value: 3100, source: "Website", stage: "Qualified", date: "Oct 14", owner: "John" },
  { id: 10, name: "Naya Home", contact: "Naya Bello", initials: "NH", value: 3200, source: "WhatsApp", stage: "Proposal", date: "Today", owner: "Ada" },
  { id: 11, name: "Mira Beauty Studio", contact: "Mira Okafor", initials: "MO", value: 2800, source: "Email", stage: "Proposal", date: "Oct 15", owner: "John" },
  { id: 12, name: "The Loom House", contact: "Chika Eze", initials: "TL", value: 2200, source: "Instagram", stage: "Proposal", date: "Oct 14", owner: "Ada" },
  { id: 13, name: "Kora Living", contact: "Tomi Adebayo", initials: "KL", value: 1500, source: "Referral", stage: "Won", date: "Oct 11", owner: "John" },
  { id: 14, name: "Biba Kulture", contact: "Biba Kalu", initials: "BK", value: 1300, source: "Instagram", stage: "Won", date: "Oct 09", owner: "Ada" },
  { id: 15, name: "Adorn Lagos", contact: "Zara Ali", initials: "AL", value: 1000, source: "Website", stage: "Won", date: "Oct 08", owner: "John" },
];
const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];
const COLORS = { New: "#58c8f0", Contacted: "#9b82ff", Qualified: "#f4bb4d", Proposal: "#f28d77", Won: "#53d5aa" };
const currency = (value) => `$${Number(value).toLocaleString("en-US")}`;

export default function PipelineBoard() {
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [view, setView] = useState("Board");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [period, setPeriod] = useState("This month");
  const [sort, setSort] = useState("Last activity");
  const [filter, setFilter] = useState("All leads");
  const [menuLead, setMenuLead] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", contact: "", value: "", source: "Instagram" });

  const visibleLeads = useMemo(() => {
    return leads.filter((lead) => {
      const term = query.trim().toLowerCase();
      const matchesQuery = !term || `${lead.name} ${lead.contact} ${lead.source}`.toLowerCase().includes(term);
      const matchesOwner = owner === "All owners" || lead.owner === owner;
      const matchesFilter = filter !== "High priority" || ["Qualified", "Proposal"].includes(lead.stage);
      const matchesDue = filter !== "Due this week" || ["Today", "Yesterday"].includes(lead.date);
      return matchesQuery && matchesOwner && matchesFilter && matchesDue;
    }).sort((a, b) => sort === "Value: high to low" ? b.value - a.value : sort === "Name" ? a.name.localeCompare(b.name) : 0);
  }, [leads, query, owner, filter, sort]);

  const moveLead = (leadId, stage) => {
    setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, stage } : lead));
    setMenuLead(null);
  };

  const addLead = (event) => {
    event.preventDefault();
    if (!newLead.name.trim()) return;
    const initials = newLead.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    setLeads((current) => [{ id: Date.now(), ...newLead, contact: newLead.contact || "New contact", initials, value: Number(newLead.value) || 0, stage: "New", date: "Today", owner: "John" }, ...current]);
    setNewLead({ name: "", contact: "", value: "", source: "Instagram" });
    setFormOpen(false);
  };

  const openAddLead = () => setFormOpen(true);

  return (
    <div className="pipeline-page">
      <section className="pipeline-heading panel">
        <div><h1>Pipeline</h1><p>Manage and move your leads through every stage.</p></div>
        <div className="pipeline-heading-actions">
          <label className="pipeline-search"><Icon name="search" size={16} /><input type="search" placeholder="Search leads" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search leads" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label>
          <button className="pipeline-add" type="button" onClick={openAddLead}><Icon name="plus" size={16} />Add lead</button>
        </div>
      </section>

      <section className="pipeline-overview">
        <div className="pipeline-overview-heading"><div><span className="pipeline-eyebrow">PIPELINE OVERVIEW</span><h2>Your pipeline, at a glance</h2><p>Track every opportunity from first contact to close.</p></div>
          <div className="pipeline-filters"><label><Icon name="leads" size={15} /><select value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="Filter by owner"><option>All owners</option><option>John</option><option>Ada</option></select><Icon name="chevron" size={14} /></label><label><Icon name="calendar" size={15} /><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Select period"><option>This month</option><option>This quarter</option><option>This year</option><option>All time</option></select><Icon name="chevron" size={14} /></label></div>
        </div>
        <div className="pipeline-stats">
          <article className="pipeline-stat" style={{ "--stat-color": "#9b82ff" }}><span>OPEN VALUE</span><strong>{currency(visibleLeads.filter((lead) => lead.stage !== "Won").reduce((total, lead) => total + lead.value, 0))}</strong><small><Icon name="trend" size={13} /> 8.4% this month</small><Icon name="report" size={17} className="pipeline-stat-icon" /></article>
          <article className="pipeline-stat" style={{ "--stat-color": "#58c8f0" }}><span>ACTIVE LEADS</span><strong>{visibleLeads.filter((lead) => lead.stage !== "Won").length}</strong><small>Across 5 stages</small><Icon name="leads" size={17} className="pipeline-stat-icon" /></article>
          <article className="pipeline-stat" style={{ "--stat-color": "#53d5aa" }}><span>CLOSING THIS MONTH</span><strong>{visibleLeads.filter((lead) => ["Proposal", "Won"].includes(lead.stage)).length}</strong><small>{currency(visibleLeads.filter((lead) => lead.stage === "Proposal").reduce((total, lead) => total + lead.value, 0))} expected</small><Icon name="calendar" size={17} className="pipeline-stat-icon" /></article>
          <Link href="/leads" className="pipeline-stat priority-stat" style={{ "--stat-color": "#ffbd4a" }}><span>PRIORITY LEADS</span><strong>{visibleLeads.filter((lead) => lead.value >= 3500).length}</strong><small>Follow-up recommended</small><Icon name="bell" size={17} className="pipeline-stat-icon" /></Link>
        </div>
      </section>

      <section className="pipeline-workspace">
        <div className="pipeline-toolbar">
          <div className="pipeline-view-toggle"><button type="button" className={view === "Board" ? "selected" : ""} onClick={() => setView("Board")}><Icon name="pipeline" size={15} />Board</button><button type="button" className={view === "List" ? "selected" : ""} onClick={() => setView("List")}><Icon name="report" size={15} />List</button></div>
          <label className="pipeline-sort"><Icon name="sort" size={15} /><span>Sort:</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort leads"><option>Last activity</option><option>Value: high to low</option><option>Name</option></select><Icon name="chevron" size={13} /></label>
          <label className="pipeline-quick-filter"><Icon name="filter" size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter leads"><option>All leads</option><option>Due this week</option><option>High priority</option></select><Icon name="chevron" size={13} /></label>
          <div className="pipeline-toolbar-end"><span>Showing {visibleLeads.length} leads</span><div className="pipeline-more-wrap"><button type="button" aria-label="More pipeline options" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}><Icon name="more" size={20} /></button>{showMore && <div className="pipeline-popover"><button type="button" onClick={() => { setFilter("All leads"); setSort("Last activity"); setOwner("All owners"); setShowMore(false); }}>Reset filters</button><button type="button" onClick={() => { setView("List"); setShowMore(false); }}>Open list view</button><button type="button" onClick={() => { setView("Board"); setShowMore(false); }}>Open board view</button></div>}</div></div>
        </div>

        {view === "Board" ? <div className="pipeline-columns">{STAGES.map((stage) => {
          const stageLeads = visibleLeads.filter((lead) => lead.stage === stage);
          const stageValue = stageLeads.reduce((total, lead) => total + lead.value, 0);
          return <section className="pipeline-column" key={stage}>
            <header className="pipeline-column-head"><div><h3><i style={{ background: COLORS[stage] }} />{stage}</h3><span>{stageLeads.length}</span></div><p>{currency(stageValue)} total value</p><button type="button" aria-label={`Add lead to ${stage}`} onClick={openAddLead}><Icon name="plus" size={14} /></button></header>
            <div className="pipeline-card-list">{stageLeads.map((lead) => <article className="pipeline-lead-card" key={lead.id}>
              <Link href={`/leads?search=${encodeURIComponent(lead.name)}`} className="pipeline-lead-main"><span className="pipeline-avatar">{lead.initials}</span><span><b>{lead.name}</b><small>{lead.contact}</small></span></Link>
              <div className="pipeline-card-value"><div><span>EST. VALUE</span><span className="pipeline-source">↗ {lead.source}</span></div><strong>{currency(lead.value)}</strong></div>
              <div className="pipeline-card-bottom"><span><Icon name="calendar" size={12} />{lead.date}</span><div className="pipeline-more-wrap"><button type="button" aria-label={`Actions for ${lead.name}`} onClick={() => setMenuLead(menuLead === lead.id ? null : lead.id)}><Icon name="more" size={18} /></button>{menuLead === lead.id && <div className="pipeline-popover card-actions"><span>Move to</span>{STAGES.filter((candidate) => candidate !== lead.stage).map((candidate) => <button key={candidate} type="button" onClick={() => moveLead(lead.id, candidate)}>{candidate}</button>)}</div>}</div></div>
            </article>)}</div>
            <button type="button" className="pipeline-column-add" onClick={openAddLead}><Icon name="plus" size={14} />Add lead</button>
          </section>;
        })}</div> : <div className="pipeline-list-view"><div className="pipeline-list-row pipeline-list-head"><span>Lead</span><span>Stage</span><span>Est. value</span><span>Source</span><span>Owner</span><span>Last activity</span></div>{visibleLeads.map((lead) => <div className="pipeline-list-row" key={lead.id}><Link href={`/leads?search=${encodeURIComponent(lead.name)}`} className="pipeline-list-lead"><span className="pipeline-avatar">{lead.initials}</span><span><b>{lead.name}</b><small>{lead.contact}</small></span></Link><label className="stage-select" style={{ "--stage-color": COLORS[lead.stage] }}><select value={lead.stage} onChange={(event) => moveLead(lead.id, event.target.value)} aria-label={`Stage for ${lead.name}`}>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select><Icon name="chevron" size={13} /></label><strong>{currency(lead.value)}</strong><span>{lead.source}</span><span>{lead.owner}</span><span>{lead.date}</span></div>)}</div>}
      </section>

      {formOpen && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section className="pipeline-modal" role="dialog" aria-modal="true" aria-labelledby="pipeline-modal-title"><header><div><h2 id="pipeline-modal-title">Add a lead</h2><p>New leads are added to the New stage.</p></div><button type="button" aria-label="Close" onClick={() => setFormOpen(false)}><Icon name="close" size={18} /></button></header><form onSubmit={addLead}><label>Business name<input required autoFocus value={newLead.name} onChange={(event) => setNewLead({ ...newLead, name: event.target.value })} placeholder="e.g. The Good Store" /></label><label>Contact name<input value={newLead.contact} onChange={(event) => setNewLead({ ...newLead, contact: event.target.value })} placeholder="Contact person" /></label><div className="pipeline-modal-fields"><label>Estimated value<input type="number" min="0" value={newLead.value} onChange={(event) => setNewLead({ ...newLead, value: event.target.value })} placeholder="0" /></label><label>Source<select value={newLead.source} onChange={(event) => setNewLead({ ...newLead, source: event.target.value })}><option>Instagram</option><option>Website</option><option>Referral</option><option>WhatsApp</option><option>Email</option></select></label></div><footer><button type="button" onClick={() => setFormOpen(false)}>Cancel</button><button className="pipeline-add" type="submit"><Icon name="plus" size={15} />Add lead</button></footer></form></section></div>}
    </div>
  );
}
