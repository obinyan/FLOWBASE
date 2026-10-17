"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import { ADD_LEAD_EVENT, LEADS_EVENT, readLeads, writeLeads } from "@/lib/leads";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];
const SOURCES = ["Website", "Instagram", "TikTok", "LinkedIn", "Facebook", "WhatsApp", "Email", "Phone", "Referral", "Event", "Other"];
const COLORS = { New: "#58c8f0", Contacted: "#9b82ff", Qualified: "#f4bb4d", Proposal: "#f28d77", Won: "#53d5aa" };
const money = (value) => `$${Number(value || 0).toLocaleString("en-US")}`;

export default function LeadsTable({ initialQuery = "", initialPriority = false }) {
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState(initialQuery);
  const [stage, setStage] = useState("All stages");
  const [source, setSource] = useState("Source");
  const [owner, setOwner] = useState("Owner");
  const [sort, setSort] = useState("Last activity");
  const [priorityOnly, setPriorityOnly] = useState(initialPriority);
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState(null);
  const [historyLead, setHistoryLead] = useState(null);
  useEffect(() => {
    const refresh = () => setLeads(readLeads()); refresh();
    window.addEventListener(LEADS_EVENT, refresh); window.addEventListener("storage", refresh);
    window.addEventListener(ADD_LEAD_EVENT, refresh);
    return () => { window.removeEventListener(LEADS_EVENT, refresh); window.removeEventListener("storage", refresh); window.removeEventListener(ADD_LEAD_EVENT, refresh); };
  }, []);

  const filtered = useMemo(() => leads.filter((lead) => {
    const term = query.trim().toLowerCase();
    return (!term || `${lead.name} ${lead.contact} ${lead.email || ""} ${lead.source} ${lead.owner}`.toLowerCase().includes(term))
      && (stage === "All stages" || lead.stage === stage) && (source === "Source" || lead.source === source)
      && (owner === "Owner" || lead.owner === owner) && (!priorityOnly || lead.priority);
  }).sort((a, b) => sort === "Highest value" ? Number(b.value || 0) - Number(a.value || 0) : sort === "Name A–Z" ? a.name.localeCompare(b.name) : sort === "Stage" ? STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) : Number(b.id) - Number(a.id)), [leads, query, stage, source, owner, sort, priorityOnly]);

  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const current = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const rangeStart = filtered.length ? (currentPage - 1) * 8 + 1 : 0;
  const rangeEnd = Math.min(currentPage * 8, filtered.length);
  const updateLead = (id, patch) => { const updated = leads.map((lead) => lead.id === id ? { ...lead, ...patch } : lead); setLeads(updated); writeLeads(updated); };
  const clearFilters = () => { setQuery(""); setStage("All stages"); setSource("Source"); setOwner("Owner"); setPriorityOnly(false); setPage(1); };

  const historyUrl = historyLead ? `/leads?search=${encodeURIComponent(historyLead.name)}&history=1` : "";
  return <div className="leads-page">
    <section className="leads-heading panel"><div><h1>Leads</h1><p>All your relationships, organized in one place.</p></div><div className="leads-heading-actions"><label className="leads-top-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search" aria-label="Search leads" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label><button type="button" className="leads-add-button" onClick={() => window.dispatchEvent(new Event(ADD_LEAD_EVENT))}><Icon name="plus" size={16} />Add lead</button></div></section>
    <section className="leads-summary"><div className="leads-summary-title"><span>LEAD MANAGEMENT</span><h2>Every lead, one clear view</h2><p>Find the right contact and keep the next step moving.</p></div><div className="leads-stats">
      <button className="leads-stat" style={{ "--lead-stat-color": "#9b82ff" }} onClick={clearFilters}><span>TOTAL LEADS</span><strong>{leads.length}</strong><small>All time</small><Icon name="leads" size={18} /></button>
      <button className="leads-stat" style={{ "--lead-stat-color": "#58c8f0" }} onClick={() => { setStage("New"); setPage(1); }}><span>NEW THIS MONTH</span><strong>{leads.filter((lead) => lead.stage === "New").length}</strong><small>New leads added</small><Icon name="calendar" size={18} /></button>
      <button className="leads-stat" style={{ "--lead-stat-color": "#f4bb4d" }} onClick={() => { setQuery("Not scheduled"); setPage(1); }}><span>FOLLOW-UPS DUE</span><strong>{leads.filter((lead) => lead.followUpDate && lead.followUpDate <= new Date().toISOString().slice(0, 10)).length}</strong><small>Due today or overdue</small><Icon name="clock" size={18} /></button>
      <button className="leads-stat" style={{ "--lead-stat-color": "#53d5aa" }} onClick={() => { setStage("Won"); setPage(1); }}><span>CONVERTED</span><strong>{leads.filter((lead) => lead.stage === "Won").length}</strong><small>Won opportunities</small><Icon name="check" size={18} /></button>
      <button className={`leads-stat leads-priority-stat ${priorityOnly ? "active" : ""}`} style={{ "--lead-stat-color": "#ffbd4a" }} onClick={() => { setPriorityOnly((value) => !value); setPage(1); }}><span>PRIORITY LEADS</span><strong>{leads.filter((lead) => lead.priority).length}</strong><small>Follow-up recommended</small><Icon name="bell" size={18} /></button>
    </div></section>
    <section className="leads-table-panel"><div className="leads-table-toolbar"><label className="leads-table-search"><Icon name="search" size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search by name, company or email" aria-label="Search by name, company or email" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label><label className="leads-select-filter"><select value={stage} onChange={(event) => { setStage(event.target.value); setPage(1); }} aria-label="Filter by stage"><option>All stages</option>{STAGES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={13} /></label><label className="leads-select-filter"><select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} aria-label="Filter by source"><option>Source</option>{SOURCES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={13} /></label><label className="leads-select-filter"><select value={owner} onChange={(event) => { setOwner(event.target.value); setPage(1); }} aria-label="Filter by owner"><option>Owner</option><option>John</option><option>You</option></select><Icon name="chevron" size={13} /></label><label className="leads-sort-select"><Icon name="sort" size={15} /><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort leads"><option>Last activity</option><option>Highest value</option><option>Name A–Z</option><option>Stage</option></select><Icon name="chevron" size={13} /></label><div className="leads-filter-wrap"><button type="button" className={`leads-filter-button ${priorityOnly ? "active" : ""}`} onClick={() => { setPriorityOnly((value) => !value); setPage(1); }}><Icon name="filter" size={15} />Priority</button></div></div>
      <div className="leads-table-scroll"><table className="leads-table"><thead><tr><th>LEAD / COMPANY</th><th>STAGE</th><th>SOURCE</th><th>OWNER</th><th>EST. VALUE</th><th>NEXT FOLLOW-UP</th><th aria-label="Actions" /></tr></thead><tbody>{current.map((lead) => <tr key={lead.id}><td><Link className="leads-company-cell" href={`/leads?search=${encodeURIComponent(lead.name)}`}><span className="leads-avatar">{lead.initials}</span><span><b>{lead.name}</b><small>{lead.contact}{lead.email ? ` · ${lead.email}` : ""}</small></span></Link></td><td><label className="lead-stage-pill" style={{ "--stage-color": COLORS[lead.stage] || COLORS.New }}><i /><select value={lead.stage || "New"} onChange={(event) => updateLead(lead.id, { stage: event.target.value })} aria-label={`Change ${lead.name} stage`}>{STAGES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={12} /></label></td><td><span className="lead-source"><Icon name="arrow" size={12} />{lead.source || "Other"}</span></td><td><span className="lead-owner"><i>{lead.owner === "You" ? "Y" : (lead.owner || "Y")[0]}</i>{lead.owner || "You"}</span></td><td className="lead-value">{money(lead.value)}</td><td><span className="lead-followup"><Icon name="calendar" size={12} />{lead.followUp || "Not scheduled"}</span></td><td /></tr>)}</tbody></table>{filtered.length === 0 && <div className="leads-empty"><Icon name="leads" size={28} /><h3>No leads yet</h3><p>Add your first customer to start building your pipeline.</p><button type="button" className="leads-add-button" onClick={() => window.dispatchEvent(new Event(ADD_LEAD_EVENT))}><Icon name="plus" size={15} />Add your first lead</button></div>}</div>
      <footer className="leads-table-footer"><span>Showing {rangeStart}–{rangeEnd} of {filtered.length} leads</span><nav aria-label="Lead pages"><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((number) => Math.max(1, number - 1))}><Icon name="chevron" size={14} className="lead-chevron-left" /></button>{Array.from({ length: Math.min(pages, 3) }, (_, index) => pages <= 3 ? index + 1 : Math.min(Math.max(currentPage - 1, 1), pages - 2) + index).map((number) => <button type="button" key={number} className={currentPage === number ? "current" : ""} onClick={() => setPage(number)}>{number}</button>)}<button type="button" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage((number) => Math.min(pages, number + 1))}><Icon name="chevron" size={14} className="lead-chevron-right" /></button></nav></footer>
    </section>
  </div>;
}
