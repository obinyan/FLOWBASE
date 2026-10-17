"use client";

import Icon from "@/components/Icons";

export default function LeadDetailsModal({ lead, onClose, onHistory }) {
  if (!lead) return null;
  const profileLinks = [
    ["Website", lead.website], ["Instagram", lead.instagram], ["TikTok", lead.tiktok],
    ["LinkedIn", lead.linkedin], ["Facebook", lead.facebook],
  ].filter(([, value]) => value);
  return <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="pipeline-modal lead-details-modal" role="dialog" aria-modal="true" aria-labelledby="lead-details-title">
      <header><div><h2 id="lead-details-title">Lead details</h2><p>Customer information and current pipeline status.</p></div><button type="button" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button></header>
      <div className="lead-detail-identity"><span className="pipeline-avatar">{lead.initials || "?"}</span><div><h3>{lead.name}</h3><p>{lead.contact || "Contact not provided"}{lead.industry ? ` · ${lead.industry}` : ""}</p></div><span className="lead-detail-stage">{lead.stage || "New"}</span></div>
      <div className="lead-detail-grid">
        <div><small>EMAIL</small><b>{lead.email || "Not provided"}</b></div><div><small>PHONE</small><b>{lead.phone || "Not provided"}</b></div>
        <div><small>ESTIMATED VALUE</small><b>${Number(lead.value || 0).toLocaleString("en-US")}</b></div><div><small>SOURCE</small><b>{lead.source || "Other"}{lead.sourceDetail ? ` · ${lead.sourceDetail}` : ""}</b></div>
        <div><small>OWNER</small><b>{lead.owner || "You"}</b></div><div><small>NEXT FOLLOW-UP</small><b>{lead.followUp || "Not scheduled"}</b></div>
        {lead.address && <div className="wide"><small>ADDRESS</small><b>{lead.address}</b></div>}
        {profileLinks.length > 0 && <div className="wide"><small>ONLINE PROFILES</small><div className="lead-detail-links">{profileLinks.map(([label, value]) => <a key={label} href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer"><Icon name={label === "Instagram" ? "instagram" : label === "LinkedIn" ? "linkedin" : "globeLink"} size={14} />{label}</a>)}</div></div>}
        {lead.about && <div className="wide"><small>ABOUT</small><p>{lead.about}</p></div>}
        {lead.notes && <div className="wide"><small>NOTES</small><p>{lead.notes}</p></div>}
      </div>
      <footer><button type="button" onClick={onClose}>Close</button><button type="button" className="pipeline-add" onClick={() => onHistory?.(lead)}><Icon name="clock" size={14} />View lead history</button></footer>
    </section>
  </div>;
}
