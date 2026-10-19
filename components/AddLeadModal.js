"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icons";
import { ADD_LEAD_EVENT, createLead, readLeads, writeLeads } from "@/lib/leads";

const BLANK = { businessName: "", contactName: "", email: "", phone: "", website: "", source: "Website", sourceDetail: "", instagram: "", tiktok: "", linkedin: "", facebook: "", address: "", industry: "", value: "", stage: "New", owner: "You", followUpDate: "", about: "", notes: "" };
const SOURCES = ["Website", "Instagram", "TikTok", "LinkedIn", "Facebook", "WhatsApp", "Email", "Phone", "Referral", "Event", "Other"];

function Field({ label, value, onChange, placeholder, type = "text", required = false }) {
  return <label>{label}<input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} /></label>;
}

export default function AddLeadModal() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(BLANK);
  const [error, setError] = useState("");

  useEffect(() => {
    const openModal = () => { setDraft(BLANK); setError(""); setOpen(true); };
    const closeOnEscape = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener(ADD_LEAD_EVENT, openModal);
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.removeEventListener(ADD_LEAD_EVENT, openModal); window.removeEventListener("keydown", closeOnEscape); };
  }, []);

  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (!draft.businessName.trim()) { setError("Enter a business or customer name."); return; }
    const lead = createLead(draft);
    writeLeads([lead, ...readLeads()]);
    setOpen(false);
  };

  if (!open) return null;
  return <div className="pipeline-modal-backdrop add-lead-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
    <section className="pipeline-modal add-lead-modal" role="dialog" aria-modal="true" aria-labelledby="add-lead-title">
      <header><div><h2 id="add-lead-title">Add a lead</h2><p>Add contact details and keep the information you have in one place.</p></div><button type="button" aria-label="Close" onClick={() => setOpen(false)}><Icon name="close" size={18} /></button></header>
      <form onSubmit={submit}>
        <div className="add-lead-form-grid">
          <div className="add-lead-group"><div className="add-lead-fields two"><Field label="Business / customer name" value={draft.businessName} onChange={(e) => change("businessName", e.target.value)} placeholder="e.g. The Good Store" required /><Field label="Website address" value={draft.website} onChange={(e) => change("website", e.target.value)} placeholder="https://example.com" type="url" /><label>Industry<input value={draft.industry} onChange={(e) => change("industry", e.target.value)} placeholder="e.g. Retail, Technology" /></label><label>Estimated value<input type="number" min="0" value={draft.value} onChange={(e) => change("value", e.target.value)} placeholder="0" /></label><label className="wide">About the customer<textarea value={draft.about} onChange={(e) => change("about", e.target.value)} placeholder="What should your team know about this customer?" rows="3" /></label></div></div>
          <div className="add-lead-group"><div className="add-lead-fields two"><Field label="Contact name" value={draft.contactName} onChange={(e) => change("contactName", e.target.value)} placeholder="Full name" /><Field label="Email address" value={draft.email} onChange={(e) => change("email", e.target.value)} placeholder="name@company.com" type="email" /><Field label="Phone number" value={draft.phone} onChange={(e) => change("phone", e.target.value)} placeholder="+234 800 000 0000" type="tel" /><label className="wide">Business address<input value={draft.address} onChange={(e) => change("address", e.target.value)} placeholder="Street, city, country" /></label></div></div>
          <div className="add-lead-group"><div className="add-lead-fields two"><Field label="Instagram" value={draft.instagram} onChange={(e) => change("instagram", e.target.value)} placeholder="@username or profile URL" /><Field label="TikTok" value={draft.tiktok} onChange={(e) => change("tiktok", e.target.value)} placeholder="@username or profile URL" /><Field label="LinkedIn" value={draft.linkedin} onChange={(e) => change("linkedin", e.target.value)} placeholder="Profile or company URL" /><Field label="Facebook" value={draft.facebook} onChange={(e) => change("facebook", e.target.value)} placeholder="Profile or page URL" /></div></div>
          <div className="add-lead-group"><h3><Icon name="pipeline" size={15} />Lead setup</h3><div className="add-lead-fields two"><label>Source<select value={draft.source} onChange={(e) => change("source", e.target.value)}>{SOURCES.map((source) => <option key={source}>{source}</option>)}</select></label><Field label="Source details" value={draft.sourceDetail} onChange={(e) => change("sourceDetail", e.target.value)} placeholder="Campaign, referral name, etc." /><label>Pipeline stage<select value={draft.stage} onChange={(e) => change("stage", e.target.value)}><option>New</option><option>Contacted</option><option>Qualified</option><option>Proposal</option><option>Won</option></select></label><Field label="Follow-up date" value={draft.followUpDate} onChange={(e) => change("followUpDate", e.target.value)} type="date" /><label className="wide">Notes<textarea value={draft.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Add any other useful details" rows="2" /></label></div></div>
        </div>
        {error && <p className="add-lead-error" role="alert">{error}</p>}
        <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="pipeline-add" type="submit"><Icon name="plus" size={15} />Add lead</button></footer>
      </form>
    </section>
  </div>;
}
