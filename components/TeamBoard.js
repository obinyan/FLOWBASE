"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icons";

const SEED = [
  { id: 1, name: "John Okafor", email: "john@flowbase.io", initials: "JO", role: "Admin", leads: 42, tasks: 7, status: "Active" },
  { id: 2, name: "Amaka Obi", email: "amaka@flowbase.io", initials: "AM", role: "Manager", leads: 36, tasks: 6, status: "Active" },
  { id: 3, name: "Tolu James", email: "tolu@flowbase.io", initials: "TO", role: "Sales rep", leads: 28, tasks: 5, status: "Active" },
  { id: 4, name: "Mira Okafor", email: "mira@flowbase.io", initials: "MI", role: "Sales rep", leads: 22, tasks: 8, status: "Active" },
  { id: 5, name: "Feyi Ade", email: "feyi@flowbase.io", initials: "FE", role: "Sales rep", leads: 18, tasks: 4, status: "Active" },
  { id: 6, name: "Lara Musa", email: "lara@flowbase.io", initials: "LA", role: "Sales rep", leads: 14, tasks: 3, status: "Active", presence: "Away" },
  { id: 7, name: "Chika Eze", email: "chika@flowbase.io", initials: "CH", role: "Viewer", leads: 0, tasks: 0, status: "Invited" },
  { id: 8, name: "Zara Ali", email: "zara@flowbase.io", initials: "ZA", role: "Sales rep", leads: 0, tasks: 0, status: "Invited" },
];
const ROLES = ["Admin", "Manager", "Sales rep", "Viewer"];

function initialsFor(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

export default function TeamBoard() {
  const [members, setMembers] = useState(SEED);
  const [storageReady, setStorageReady] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All roles");
  const [status, setStatus] = useState("All status");
  const [quickFilter, setQuickFilter] = useState("All members");
  const [selected, setSelected] = useState([]);
  const [menuId, setMenuId] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({ name: "", email: "", role: "Sales rep", status: "Active", leads: 0, tasks: 0 });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("flowbase:team:v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMembers(parsed);
      }
    } catch {}
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try { window.localStorage.setItem("flowbase:team:v1", JSON.stringify(members)); } catch {}
  }, [members, storageReady]);

  const activeCount = members.filter((member) => member.status === "Active").length;
  const invitationCount = members.filter((member) => member.status === "Invited").length;
  const totalLeads = members.reduce((sum, member) => sum + Number(member.leads || 0), 0);
  const visibleMembers = useMemo(() => members.filter((member) => {
    const search = query.trim().toLowerCase();
    return (!search || `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(search))
      && (role === "All roles" || member.role === role)
      && (status === "All status" || (status === "Away" ? member.presence === "Away" : member.status === status))
      && (quickFilter !== "Active members" || member.status === "Active")
      && (quickFilter !== "Admins" || member.role === "Admin")
      && (quickFilter !== "Invitations" || member.status === "Invited");
  }), [members, query, role, status, quickFilter]);
  const selectedAll = visibleMembers.length > 0 && visibleMembers.every((member) => selected.includes(member.id));
  const workload = members.filter((member) => member.leads > 0).sort((a, b) => b.leads - a.leads).slice(0, 5);
  const capacity = Math.min(100, Math.round((totalLeads / 222) * 100));

  const resetFilters = () => { setQuery(""); setRole("All roles"); setStatus("All status"); setQuickFilter("All members"); };
  const updateMember = (id, patch) => setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  const openInvite = () => { setDraft({ name: "", email: "", role: "Sales rep", status: "Active", leads: 0, tasks: 0 }); setModal({ type: "invite" }); };
  const openEdit = (member) => { setDraft({ name: member.name, email: member.email, role: member.role, status: member.status, leads: member.leads, tasks: member.tasks }); setModal({ type: "edit", id: member.id }); };
  const saveMember = (event) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) return;
    const member = { ...draft, initials: initialsFor(draft.name), leads: Number(draft.leads) || 0, tasks: Number(draft.tasks) || 0 };
    if (modal.type === "edit") updateMember(modal.id, member);
    else setMembers((current) => [...current, { ...member, id: Date.now(), status: "Invited", leads: 0, tasks: 0 }]);
    setModal(null);
  };
  const removeMember = (id) => { setMembers((current) => current.filter((member) => member.id !== id)); setSelected((current) => current.filter((value) => value !== id)); setMenuId(null); };
  const bulkSetRole = (nextRole) => { setMembers((current) => current.map((member) => selected.includes(member.id) ? { ...member, role: nextRole } : member)); setSelected([]); };

  return <div className="team-page">
    <section className="team-heading panel"><div><h1>Team</h1><p>Bring your people together and see work at a glance.</p></div><div className="team-heading-actions"><label className="team-top-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search team" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={14} /></button>}</label><button type="button" className="team-invite-button" onClick={openInvite}><Icon name="plus" size={16} />Invite member</button></div></section>

    <section className="team-overview"><div className="team-overview-title"><span>WORKSPACE PEOPLE</span><h2>Your team, working in sync</h2><p>Manage access, ownership, and workload across Flowbase.</p></div><div className="team-stats">
      <button className="team-stat" style={{ "--team-stat-color": "#9477ff" }} onClick={resetFilters}><span>TEAM MEMBERS</span><strong>{members.length}</strong><small>{activeCount} active now</small></button>
      <a className="team-stat" href="/leads" style={{ "--team-stat-color": "#58c8f0" }}><span>OPEN LEADS</span><strong>{totalLeads}</strong><small>Across the team</small></a>
      <a className="team-stat" href="/tasks" style={{ "--team-stat-color": "#f4bb4d" }}><span>TASKS THIS WEEK</span><strong>42</strong><small>11 completed</small></a>
      <button className="team-stat" style={{ "--team-stat-color": "#f28d77" }} onClick={() => setQuickFilter(quickFilter === "Invitations" ? "All members" : "Invitations")}><span>PENDING INVITES</span><strong>{invitationCount}</strong><small>Awaiting response</small></button>
    </div></section>

    <div className="team-content-grid"><section className="team-list-panel">
      <div className="team-toolbar"><label className="team-list-search"><Icon name="search" size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" aria-label="Search team members" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" size={13} /></button>}</label>
        <label className="team-select"><select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role"><option>All roles</option>{ROLES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={13} /></label>
        <label className="team-select"><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option>All status</option><option>Active</option><option>Invited</option><option>Away</option></select><Icon name="chevron" size={13} /></label>
        <label className="team-selectall"><input type="checkbox" checked={selectedAll} onChange={() => setSelected((current) => selectedAll ? current.filter((id) => !visibleMembers.some((member) => member.id === id)) : [...new Set([...current, ...visibleMembers.map((member) => member.id)])])} />Select all</label>
        <div className="team-more-wrap"><button type="button" aria-label="Team options" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}><Icon name="more" size={19} /></button>{showMore && <div className="pipeline-popover"><button type="button" onClick={() => { setQuickFilter("Active members"); setShowMore(false); }}>Show active members</button><button type="button" onClick={() => { resetFilters(); setShowMore(false); }}>Reset filters</button><button type="button" onClick={() => { openInvite(); setShowMore(false); }}>Invite member</button></div>}</div>
      </div>
      <div className="team-board-filters"><span>TEAM FILTERS</span>{["Active members", "Admins", "Invitations"].map((filter) => <button type="button" key={filter} className={quickFilter === filter ? "active" : ""} onClick={() => setQuickFilter(quickFilter === filter ? "All members" : filter)}><i />{filter}</button>)}{quickFilter !== "All members" && <button type="button" className="team-clear-filter" onClick={() => setQuickFilter("All members")}>Clear</button>}</div>
      {selected.length > 0 && <div className="team-bulkbar"><span>{selected.length} selected</span><label>Set role<select key={selected.length} defaultValue="" onChange={(event) => event.target.value && bulkSetRole(event.target.value)}><option value="" disabled>Choose role</option>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={() => setSelected([])}>Clear selection</button></div>}
      <div className="team-table-scroll"><table className="team-table"><thead><tr><th className="team-check-cell" /><th>MEMBER</th><th>ROLE</th><th>LEADS</th><th>TASKS</th><th>STATUS</th><th aria-label="Actions" /></tr></thead><tbody>{visibleMembers.map((member) => <tr key={member.id} className={selected.includes(member.id) ? "selected" : ""}><td className="team-check-cell"><input type="checkbox" checked={selected.includes(member.id)} onChange={() => setSelected((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} aria-label={`Select ${member.name}`} /></td><td><button type="button" className="team-person-cell" onClick={() => openEdit(member)}><i className="team-avatar">{member.initials}</i><span><b>{member.name}</b><small>{member.email}</small></span></button></td><td><label className="team-role-pill"><select value={member.role} onChange={(event) => updateMember(member.id, { role: event.target.value })} aria-label={`Role for ${member.name}`}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select><Icon name="chevron" size={11} /></label></td><td>{member.leads}</td><td>{member.tasks}</td><td><label className={`team-status-pill ${member.presence === "Away" ? "away" : member.status.toLowerCase()}`}><i /><select value={member.presence === "Away" && member.status === "Active" ? "Away" : member.status} onChange={(event) => updateMember(member.id, { status: event.target.value === "Away" ? "Active" : event.target.value, presence: event.target.value === "Away" ? "Away" : "" })} aria-label={`Status for ${member.name}`}><option>Active</option><option>Away</option><option>Invited</option></select><Icon name="chevron" size={11} /></label></td><td className="team-row-action"><div className="team-more-wrap"><button type="button" aria-label={`Actions for ${member.name}`} aria-expanded={menuId === member.id} onClick={() => setMenuId(menuId === member.id ? null : member.id)}><Icon name="more" size={18} /></button>{menuId === member.id && <div className="pipeline-popover"><button type="button" onClick={() => { openEdit(member); setMenuId(null); }}>Edit member</button><button type="button" onClick={() => { updateMember(member.id, { status: "Active", presence: "" }); setMenuId(null); }}>{member.status === "Invited" ? "Accept invitation" : member.presence === "Away" ? "Set active" : "Set away"}</button><button type="button" onClick={() => removeMember(member.id)}>Remove member</button></div>}</div></td></tr>)}</tbody></table>{visibleMembers.length === 0 && <div className="team-empty"><Icon name="leads" size={24} /><p>No team members match these filters.</p><button type="button" onClick={resetFilters}>Clear filters</button></div>}</div>
      <button type="button" className="team-invite-strip" onClick={openInvite}><Icon name="plus" size={13} />Invite a teammate</button>
    </section>

    <aside className="team-activity-panel"><header><h2>Team activity</h2><p>Lead ownership and task load</p></header><section className="team-capacity-card"><span>TEAM CAPACITY</span><b>{capacity}% assigned</b><small>{totalLeads} leads shared across {activeCount} active members</small><i><span style={{ width: `${capacity}%` }} /></i></section>
      <section className="team-ownership"><span>LEAD OWNERSHIP</span>{workload.map((member, index) => <div className="team-owner-bar" key={member.id}><p><span>{member.name.split(" ")[0]}</span><b>{member.leads}</b></p><i><span className={`owner-fill fill-${index}`} style={{ width: `${Math.max(8, member.leads / Math.max(...workload.map((person) => person.leads)) * 100)}%` }} /></i></div>)}</section>
      <section className="team-recent"><span>RECENT ACTIVITY</span>{[{ initials: "AM", name: "Amaka added a new lead", detail: "Mira Beauty Studio", time: "10 min ago" }, { initials: "JO", name: "John moved a lead", detail: "Glitz N Glam · Proposal", time: "32 min ago" }, { initials: "TO", name: "Tolu completed a task", detail: "Follow-up · Shopkyluxury", time: "1 hr ago" }].map((item) => <article key={item.name}><i>{item.initials}</i><div><b>{item.name}</b><small>{item.detail}</small></div><time>{item.time}</time></article>)}</section>
      <button type="button" className="team-activity-link" onClick={() => setModal({ type: "activity" })}>View team activity <Icon name="arrow" size={13} /></button>
    </aside></div>

    {modal && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className="pipeline-modal team-modal" role="dialog" aria-modal="true" aria-labelledby="team-modal-title"><header><div><h2 id="team-modal-title">{modal.type === "invite" ? "Invite a teammate" : modal.type === "activity" ? "Team activity" : "Edit team member"}</h2><p>{modal.type === "invite" ? "Send an invitation to your workspace." : modal.type === "activity" ? "Recent changes across your workspace." : "Update access and team details."}</p></div><button type="button" aria-label="Close" onClick={() => setModal(null)}><Icon name="close" size={18} /></button></header>{modal.type === "activity" ? <div className="team-activity-modal-list"><p>Amaka added Mira Beauty Studio · 10 min ago</p><p>John moved Glitz N Glam to Proposal · 32 min ago</p><p>Tolu completed a follow-up for Shopkyluxury · 1 hr ago</p><p>Feyi updated a lead profile · Yesterday</p></div> : <form onSubmit={saveMember}><label>Full name<input required autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Member name" /></label><label>Email address<input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="name@company.com" /></label><div className="pipeline-modal-fields"><label>Role<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>{modal.type === "edit" && <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Active</option><option>Invited</option></select></label>}</div>{modal.type === "edit" && <div className="pipeline-modal-fields"><label>Open leads<input type="number" min="0" value={draft.leads} onChange={(event) => setDraft({ ...draft, leads: event.target.value })} /></label><label>Tasks this week<input type="number" min="0" value={draft.tasks} onChange={(event) => setDraft({ ...draft, tasks: event.target.value })} /></label></div>}<footer><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="pipeline-add" type="submit">{modal.type === "invite" ? "Send invitation" : "Save changes"}</button></footer></form>}</section></div>}
  </div>;
}
