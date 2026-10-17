"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import { ADD_LEAD_EVENT, LEADS_EVENT, readLeads, writeLeads } from "@/lib/leads";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];
const COLORS = { New: "#58c8f0", Contacted: "#9b82ff", Qualified: "#f4bb4d", Proposal: "#f28d77", Won: "#53d5aa" };
const currency = (value) => `$${Number(value || 0).toLocaleString("en-US")}`;

export default function PipelineBoard() {
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState("Board");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("All owners");
  const [period, setPeriod] = useState("This month");
  const [sort, setSort] = useState("Last activity");
  const [filter, setFilter] = useState("All leads");
  const [menuLead, setMenuLead] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    const refresh = () => setLeads(readLeads());
    refresh();
    window.addEventListener(LEADS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(ADD_LEAD_EVENT, refresh);
    return () => { window.removeEventListener(LEADS_EVENT, refresh); window.removeEventListener("storage", refresh); window.removeEventListener(ADD_LEAD_EVENT, refresh); };
  }, []);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || `${lead.name} ${lead.contact} ${lead.source} ${lead.email || ""}`.toLowerCase().includes(term);
    const matchesOwner = owner === "All owners" || lead.owner === owner;
    const matchesFilter = filter !== "High priority" || ["Qualified", "Proposal"].includes(lead.stage);
    const matchesDue = filter !== "Due this week" || lead.followUp !== "Not scheduled";
    return matchesQuery && matchesOwner && matchesFilter && matchesDue;
  }).sort((a, b) => sort === "Value: high to low" ? b.value - a.value : sort === "Name" ? a.name.localeCompare(b.name) : 0), [leads, query, owner, filter, sort]);

  const moveLead = (leadId, stage) => { const updated = leads.map((lead) => lead.id === leadId ? { ...lead, stage } : lead); setLeads(updated); writeLeads(updated); setMenuLead(null); };

  return <div className="pipeline-page">
    <section className="pipeline-heading panel"><div><h1>Pipeline</h1><p>Manage and move your leads through every stage.</p></div><div className="pipeline-heading-actions"><label className="pipeline-search"><Icon name="search" size={16} /><input type="search" placeholder="Search leads" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search leads" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label><button className="pipeline-add" type="button" onClick={() => window.dispatchEvent(new Event(ADD_LEAD_EVENT))}><Icon name="plus" size={16} />Add lead</button></div></section>
    <section className="pipeline-overview"><div className="pipeline-overview-heading"><div><span className="pipeline-eyebrow">PIPELINE OVERVIEW</span><h2>Your pipeline, at a glance</h2><p>Track every opportunity from first contact to close.</p></div><div className="pipeline-filters"><label><Icon name="leads" size={15} /><select value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="Filter by owner"><option>All owners</option><option>John</option><option>Ada</option><option>You</option></select><Icon name="chevron" size={14} /></label><label><Icon name="calendar" size={15} /><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Select period"><option>This month</option><option>This quarter</option><option>This year</option><option>All time</option></select><Icon name="chevron" size={14} /></label></div></div>
      <div className="pipeline-stats"><article className="pipeline-stat" style={{ "--stat-color": "#9b82ff" }}><span>OPEN VALUE</span><strong>{currency(visibleLeads.filter((lead) => lead.stage !== "Won").reduce((sum, lead) => sum + Number(lead.value || 0), 0))}</strong><small>Current pipeline value</small><Icon name="report" size={17} className="pipeline-stat-icon" /></article><article className="pipeline-stat" style={{ "--stat-color": "#58c8f0" }}><span>ACTIVE LEADS</span><strong>{visibleLeads.filter((lead) => lead.stage !== "Won").length}</strong><small>Across 5 stages</small><Icon name="leads" size={17} className="pipeline-stat-icon" /></article><article className="pipeline-stat" style={{ "--stat-color": "#53d5aa" }}><span>CLOSING THIS MONTH</span><strong>{visibleLeads.filter((lead) => ["Proposal", "Won"].includes(lead.stage)).length}</strong><small>{currency(visibleLeads.filter((lead) => lead.stage === "Proposal").reduce((sum, lead) => sum + Number(lead.value || 0), 0))} expected</small><Icon name="calendar" size={17} className="pipeline-stat-icon" /></article><Link href="/leads" className="pipeline-stat priority-stat" style={{ "--stat-color": "#ffbd4a" }}><span>PRIORITY LEADS</span><strong>{visibleLeads.filter((lead) => lead.priority).length}</strong><small>Follow-up recommended</small><Icon name="bell" size={17} className="pipeline-stat-icon" /></Link></div>
    </section>
    <section className="pipeline-workspace"><div className="pipeline-toolbar"><div className="pipeline-view-toggle"><button type="button" className={view === "Board" ? "selected" : ""} onClick={() => setView("Board")}><Icon name="pipeline" size={15} />Board</button><button type="button" className={view === "List" ? "selected" : ""} onClick={() => setView("List")}><Icon name="report" size={15} />List</button></div><label className="pipeline-sort"><Icon name="sort" size={15} /><span>Sort:</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort leads"><option>Last activity</option><option>Value: high to low</option><option>Name</option></select><Icon name="chevron" size={13} /></label><label className="pipeline-quick-filter"><Icon name="filter" size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter leads"><option>All leads</option><option>Due this week</option><option>High priority</option></select><Icon name="chevron" size={13} /></label><div className="pipeline-toolbar-end"><span>Showing {visibleLeads.length} leads</span><div className="pipeline-more-wrap"><button type="button" aria-label="More pipeline options" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}><Icon name="more" size={20} /></button>{showMore && <div className="pipeline-popover"><button type="button" onClick={() => { setFilter("All leads"); setSort("Last activity"); setOwner("All owners"); setShowMore(false); }}>Reset filters</button><button type="button" onClick={() => { setView("List"); setShowMore(false); }}>Open list view</button><button type="button" onClick={() => { setView("Board"); setShowMore(false); }}>Open board view</button></div>}</div></div></div>
      {view === "Board" ? <div className="pipeline-columns">{STAGES.map((stage) => { const stageLeads = visibleLeads.filter((lead) => lead.stage === stage); const stageValue = stageLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0); return <section className="pipeline-column" key={stage}><header className="pipeline-column-head"><div><h3><i style={{ background: COLORS[stage] }} />{stage}</h3><span>{stageLeads.length}</span></div><p>{currency(stageValue)} total value</p></header><div className="pipeline-card-list">{stageLeads.map((lead) => <article className="pipeline-lead-card" key={lead.id}><button type="button" className="pipeline-lead-main pipeline-lead-open" onClick={() => setSelectedLead(lead)}><span className="pipeline-avatar">{lead.initials}</span><span><b>{lead.name}</b><small>{lead.contact}</small></span></button><div className="pipeline-card-value"><div><span>EST. VALUE</span><span className="pipeline-source">↗ {lead.source || "Other"}</span></div><strong>{currency(lead.value)}</strong></div><div className="pipeline-card-bottom"><span><Icon name="calendar" size={12} />{lead.followUp || "Not scheduled"}</span><div className="pipeline-more-wrap"><button type="button" aria-label={`Actions for ${lead.name}`} onClick={() => setMenuLead(menuLead === lead.id ? null : lead.id)}><Icon name="more" size={18} /></button>{menuLead === lead.id && <div className="pipeline-popover card-actions"><span>Move to</span>{STAGES.filter((candidate) => candidate !== lead.stage).map((candidate) => <button key={candidate} type="button" onClick={() => moveLead(lead.id, candidate)}>{candidate}</button>)}</div>}</div></div></article>)}</div><button type="button" className="pipeline-column-add" onClick={() => window.dispatchEvent(new Event(ADD_LEAD_EVENT))}><Icon name="plus" size={14} />Add lead</button></section>; })}</div> : <div className="pipeline-list-view"><div className="pipeline-list-row pipeline-list-head"><span>Lead</span><span>Stage</span><span>Est. value</span><span>Source</span><span>Owner</span><span>Last activity</span></div>{visibleLeads.map((lead) => <div className="pipeline-list-row" key={lead.id}><button type="button" className="pipeline-list-lead pipeline-lead-open" onClick={() => setSelectedLead(lead)}><span className="pipeline-avatar">{lead.initials}</span><span><b>{lead.name}</b><small>{lead.contact}</small></span></button><label className="stage-select" style={{ "--stage-color": COLORS[lead.stage] }}><select value={lead.stage} onChange={(event) => moveLead(lead.id, event.target.value)} aria-label={`Stage for ${lead.name}`}>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select><Icon name="chevron" size={13} /></label><strong>{currency(lead.value)}</strong><span>{lead.source}</span><span>{lead.owner}</span><span>{lead.date}</span></div>)}{visibleLeads.length === 0 && <div className="pipeline-empty"><Icon name="leads" size={25} /><b>Your pipeline is ready</b><span>Add your first lead to start tracking opportunities.</span><button type="button" className="pipeline-add" onClick={() => window.dispatchEvent(new Event(ADD_LEAD_EVENT))}><Icon name="plus" size={14} />Add lead</button></div>}</div>}
      {selectedLead && <LeadDetailsModal lead={selectedLead} onClose={() => setSelectedLead(null)} onHistory={(lead) => { setSelectedLead(null); window.location.href = `/leads?search=${encodeURIComponent(lead.name)}&history=1`; }} />}
    </section>
  </div>;
}
