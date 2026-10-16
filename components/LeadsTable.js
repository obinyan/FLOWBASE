"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";

const BASE = [
  ["Biba Kulture", "Biba Kalu", "BK", "Qualified", "Instagram", "John", 5000, "Today, 9:30 AM", true],
  ["Glitz N Glam", "Tolu James · Beauty", "GN", "Proposal", "Instagram", "John", 3600, "Today, 11:00 AM", true],
  ["Mira Beauty Studio", "Mira Okafor · Beauty", "MO", "New", "Instagram", "You", 2400, "Today, 2:00 PM", false],
  ["Naya Home", "Naya Bello · Home goods", "NH", "Contacted", "Website", "John", 1800, "Overdue · 2 days", false],
  ["Shopkyluxury", "Kemi Ayo · Fashion / Retail", "SK", "Qualified", "Referral", "You", 4250, "Oct 17, 10:00 AM", true],
  ["Lush Skin Co.", "Amaka Obi · Beauty", "LS", "Contacted", "Referral", "John", 2100, "Oct 18, 1:30 PM", false],
  ["Kora Living", "Tomi Adebayo · Home goods", "KL", "Won", "Referral", "You", 1500, "Completed Oct 11", false],
  ["Ola Essentials", "Feyi Ade · Retail", "OE", "New", "Website", "John", 1950, "Oct 19, 9:00 AM", false],
  ["Soko Home", "Lara Musa · Home goods", "SH", "Qualified", "Website", "John", 3100, "Oct 20, 10:00 AM", true],
  ["The Loom House", "Chika Eze · Fashion", "TL", "Proposal", "Instagram", "You", 2200, "Oct 21, 11:00 AM", false],
  ["Adorn Lagos", "Zara Ali · Retail", "AL", "Won", "Website", "John", 1000, "Completed Oct 08", false],
  ["Kora Living Plus", "Tomi Adebayo · Home goods", "KP", "New", "WhatsApp", "You", 2800, "Oct 22, 2:00 PM", false],
  ["Naya Home Decor", "Naya Bello · Home goods", "ND", "Contacted", "Email", "John", 2400, "Oct 23, 9:30 AM", false],
  ["Biba Kulture Studio", "Biba Kalu · Fashion", "BS", "Qualified", "Instagram", "You", 3900, "Oct 24, 12:00 PM", true],
  ["Mira Beauty Lagos", "Mira Okafor · Beauty", "ML", "New", "Referral", "John", 1750, "Oct 25, 3:00 PM", false],
];
const COLORS = { New: "#58c8f0", Contacted: "#9b82ff", Qualified: "#f4bb4d", Proposal: "#f28d77", Won: "#53d5aa" };
const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];
const SOURCES = ["Instagram", "Website", "Referral", "WhatsApp", "Email"];
const money = (value) => `$${Number(value).toLocaleString("en-US")}`;
const makeInitialLeads = () => Array.from({ length: 160 }, (_, index) => {
  const item = BASE[index % BASE.length];
  const cycle = Math.floor(index / BASE.length);
  return { id: index + 1, name: cycle ? `${item[0]} ${cycle + 1}` : item[0], contact: item[1], initials: item[2], stage: item[3], source: item[4], owner: item[5], value: item[6] + cycle * 150, followUp: item[7], priority: item[8] };
});

export default function LeadsTable({ initialQuery = "", initialPriority = false }) {
  const [leads, setLeads] = useState(makeInitialLeads);
  const [query, setQuery] = useState(initialQuery);
  const [stage, setStage] = useState("All stages");
  const [source, setSource] = useState("Source");
  const [owner, setOwner] = useState("Owner");
  const [sort, setSort] = useState("Last activity");
  const [priorityOnly, setPriorityOnly] = useState(initialPriority);
  const [selected, setSelected] = useState([]);
  const [menuId, setMenuId] = useState(null);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", contact: "", source: "Instagram", value: "" });
  const perPage = 8;

  const filtered = useMemo(() => leads.filter((lead) => {
    const term = query.trim().toLowerCase();
    return (!term || `${lead.name} ${lead.contact} ${lead.source} ${lead.owner} ${lead.followUp}`.toLowerCase().includes(term))
      && (stage === "All stages" || lead.stage === stage)
      && (source === "Source" || lead.source === source)
      && (owner === "Owner" || lead.owner === owner)
      && (!priorityOnly || lead.priority);
  }).sort((a, b) => sort === "Highest value" ? b.value - a.value : sort === "Name A–Z" ? a.name.localeCompare(b.name) : sort === "Stage" ? STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) : a.id - b.id), [leads, query, stage, source, owner, sort, priorityOnly]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pages);
  const current = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const rangeStart = filtered.length ? (currentPage - 1) * perPage + 1 : 0;
  const rangeEnd = Math.min(currentPage * perPage, filtered.length);
  const selectedAll = current.length > 0 && current.every((lead) => selected.includes(lead.id));
  const updateLead = (id, patch) => setLeads((items) => items.map((lead) => lead.id === id ? { ...lead, ...patch } : lead));
  const toggleSelected = (id) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const addLead = (event) => {
    event.preventDefault();
    if (!newLead.name.trim()) return;
    const initials = newLead.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    setLeads((items) => [{ id: Date.now(), name: newLead.name, contact: newLead.contact || "New contact", initials, stage: "New", source: newLead.source, owner: "You", value: Number(newLead.value) || 0, followUp: "Today", priority: false }, ...items]);
    setNewLead({ name: "", contact: "", source: "Instagram", value: "" });
    setPage(1);
    setAddOpen(false);
  };
  const clearFilters = () => { setQuery(""); setStage("All stages"); setSource("Source"); setOwner("Owner"); setPriorityOnly(false); setPage(1); };

  return <div className="leads-page">
    <section className="leads-heading panel"><div><h1>Leads</h1><p>All your relationships, organized in one place.</p></div><div className="leads-heading-actions"><label className="leads-top-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search" aria-label="Search leads" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label><button type="button" className="leads-add-button" onClick={() => setAddOpen(true)}><Icon name="plus" size={16} />Add lead</button></div></section>

    <section className="leads-summary"><div className="leads-summary-title"><span>LEAD MANAGEMENT</span><h2>Every lead, one clear view</h2><p>Find the right contact and keep the next step moving.</p></div>
      <div className="leads-stats">
        <button className="leads-stat" style={{ "--lead-stat-color": "#9b82ff" }} onClick={clearFilters}><span>TOTAL LEADS</span><strong>{leads.length}</strong><small>All time</small><Icon name="leads" size={18} /></button>
        <button className="leads-stat" style={{ "--lead-stat-color": "#58c8f0" }} onClick={() => { setStage("New"); setPage(1); }}><span>NEW THIS MONTH</span><strong>16</strong><small><Icon name="trend" size={12} /> 12% vs last month</small><Icon name="calendar" size={18} /></button>
        <button className="leads-stat" style={{ "--lead-stat-color": "#f4bb4d" }} onClick={() => { setQuery("Today"); setPage(1); }}><span>FOLLOW-UPS DUE</span><strong>9</strong><small>3 need a response</small><Icon name="clock" size={18} /></button>
        <button className="leads-stat" style={{ "--lead-stat-color": "#53d5aa" }} onClick={() => { setStage("Won"); setPage(1); }}><span>CONVERTED</span><strong>28</strong><small>18% conversion rate</small><Icon name="check" size={18} /></button>
        <button className={`leads-stat leads-priority-stat ${priorityOnly ? "active" : ""}`} style={{ "--lead-stat-color": "#ffbd4a" }} onClick={() => { setPriorityOnly((value) => !value); setPage(1); }}><span>PRIORITY LEADS</span><strong>{leads.filter((lead) => lead.priority).length}</strong><small>{priorityOnly ? "Showing priority leads" : "Follow-up recommended"}</small><Icon name="bell" size={18} /></button>
      </div>
    </section>

    <section className="leads-table-panel">
      <div className="leads-table-toolbar">
        <label className="leads-table-search"><Icon name="search" size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search by name, company or email" aria-label="Search by name, company or email" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label>
        <label className="leads-select-filter"><select value={stage} onChange={(event) => { setStage(event.target.value); setPage(1); }} aria-label="Filter by stage"><option>All stages</option>{STAGES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={13} /></label>
        <label className="leads-select-filter"><select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} aria-label="Filter by source"><option>Source</option>{SOURCES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={13} /></label>
        <label className="leads-select-filter"><select value={owner} onChange={(event) => { setOwner(event.target.value); setPage(1); }} aria-label="Filter by owner"><option>Owner</option><option>John</option><option>You</option></select><Icon name="chevron" size={13} /></label>
        <label className="leads-sort-select"><Icon name="sort" size={15} /><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort leads"><option>Last activity</option><option>Highest value</option><option>Name A–Z</option><option>Stage</option></select><Icon name="chevron" size={13} /></label>
        <div className="leads-filter-wrap"><button type="button" className={`leads-filter-button ${priorityOnly ? "active" : ""}`} onClick={() => { setPriorityOnly((value) => !value); setPage(1); }}><Icon name="filter" size={15} />Filter</button></div>
      </div>

      {selected.length > 0 && <div className="leads-bulk-bar"><span>{selected.length} selected</span><button type="button" onClick={() => { setLeads((items) => items.map((lead) => selected.includes(lead.id) ? { ...lead, priority: true } : lead)); setSelected([]); }}>Mark priority</button><button type="button" onClick={() => setSelected([])}>Clear selection</button></div>}
      <div className="leads-table-scroll"><table className="leads-table"><thead><tr><th className="lead-check"><input type="checkbox" checked={selectedAll} onChange={() => setSelected((items) => selectedAll ? items.filter((id) => !current.some((lead) => lead.id === id)) : [...new Set([...items, ...current.map((lead) => lead.id)])])} aria-label="Select all leads on this page" /></th><th>LEAD / COMPANY</th><th>STAGE</th><th>SOURCE</th><th>OWNER</th><th>EST. VALUE</th><th>NEXT FOLLOW-UP</th><th aria-label="Actions" /></tr></thead><tbody>{current.map((lead) => <tr key={lead.id} className={selected.includes(lead.id) ? "selected" : ""}>
        <td className="lead-check"><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelected(lead.id)} aria-label={`Select ${lead.name}`} /></td>
        <td><Link className="leads-company-cell" href={`/leads?search=${encodeURIComponent(lead.name)}`}><span className="leads-avatar">{lead.initials}</span><span><b>{lead.name}</b><small>{lead.contact}</small></span></Link></td>
        <td><label className="lead-stage-pill" style={{ "--stage-color": COLORS[lead.stage] }}><i /> <select value={lead.stage} onChange={(event) => updateLead(lead.id, { stage: event.target.value })} aria-label={`Change ${lead.name} stage`}>{STAGES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={12} /></label></td>
        <td><span className="lead-source"><Icon name="arrow" size={12} />{lead.source}</span></td>
        <td><span className="lead-owner"><i>{lead.owner === "You" ? "Y" : "J"}</i>{lead.owner}</span></td>
        <td className="lead-value">{money(lead.value)}</td>
        <td><span className={`lead-followup ${lead.followUp.startsWith("Overdue") ? "overdue" : ""}`}><Icon name="calendar" size={12} />{lead.followUp}</span></td>
        <td className="lead-row-menu"><div className="lead-action-wrap"><button type="button" aria-label={`Actions for ${lead.name}`} aria-expanded={menuId === lead.id} onClick={() => setMenuId(menuId === lead.id ? null : lead.id)}><Icon name="more" size={19} /></button>{menuId === lead.id && <div className="pipeline-popover"><Link href={`/leads?search=${encodeURIComponent(lead.name)}`}>View lead</Link><button type="button" onClick={() => { updateLead(lead.id, { priority: !lead.priority }); setMenuId(null); }}>{lead.priority ? "Remove priority" : "Mark priority"}</button><button type="button" onClick={() => { setSelected((items) => [...new Set([...items, lead.id])]); setMenuId(null); }}>Select lead</button></div>}</div></td>
      </tr>)}</tbody></table></div>
      <footer className="leads-table-footer"><span>Showing {rangeStart}–{rangeEnd} of {filtered.length} leads</span><nav aria-label="Lead pages"><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((number) => Math.max(1, number - 1))}><Icon name="chevron" size={14} className="lead-chevron-left" /></button>{Array.from({ length: Math.min(pages, 3) }, (_, index) => pages <= 3 ? index + 1 : Math.min(Math.max(currentPage - 1, 1), pages - 2) + index).map((number) => <button type="button" key={number} className={currentPage === number ? "current" : ""} onClick={() => setPage(number)}>{number}</button>)}{pages > 3 && <span>…</span>}<button type="button" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage((number) => Math.min(pages, number + 1))}><Icon name="chevron" size={14} className="lead-chevron-right" /></button></nav></footer>
    </section>

    {addOpen && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOpen(false); }}><section className="pipeline-modal" role="dialog" aria-modal="true" aria-labelledby="new-lead-title"><header><div><h2 id="new-lead-title">Add a lead</h2><p>Capture a relationship and its next step.</p></div><button type="button" aria-label="Close" onClick={() => setAddOpen(false)}><Icon name="close" size={18} /></button></header><form onSubmit={addLead}><label>Lead / company<input required autoFocus value={newLead.name} onChange={(event) => setNewLead({ ...newLead, name: event.target.value })} placeholder="Company name" /></label><label>Contact name<input value={newLead.contact} onChange={(event) => setNewLead({ ...newLead, contact: event.target.value })} placeholder="Contact person" /></label><div className="pipeline-modal-fields"><label>Source<select value={newLead.source} onChange={(event) => setNewLead({ ...newLead, source: event.target.value })}>{SOURCES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Estimated value<input type="number" min="0" value={newLead.value} onChange={(event) => setNewLead({ ...newLead, value: event.target.value })} placeholder="0" /></label></div><footer><button type="button" onClick={() => setAddOpen(false)}>Cancel</button><button className="pipeline-add" type="submit"><Icon name="plus" size={15} />Add lead</button></footer></form></section></div>}
  </div>;
}
