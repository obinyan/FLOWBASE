"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icons";

const SECTIONS = [
  { id: "profile", title: "Profile", description: "Personal details and photo", icon: "user" },
  { id: "workspace", title: "Workspace", description: "Name, logo, and defaults", icon: "briefcase" },
  { id: "team-access", title: "Team & access", description: "Roles and permissions", icon: "shield" },
  { id: "notifications", title: "Notifications", description: "Email and in-app alerts", icon: "bellOn" },
  { id: "integrations", title: "Integrations", description: "Connected tools", icon: "plug" },
  { id: "data-privacy", title: "Data & privacy", description: "Export and retention", icon: "lock" },
  { id: "preferences", title: "Preferences", description: "Appearance and language", icon: "sliders" },
];

const INITIAL = {
  firstName: "John", lastName: "Okafor", email: "john@flowbase.io", title: "Sales manager",
  phone: "+234 801 234 5678", timezone: "Africa/Lagos", workspace: "Flowbase", language: "English",
  twoFactor: true, emailUpdates: true, weeklyDigest: false, productTips: true, theme: "Dark",
};

function Field({ label, children }) {
  return <label className="settings-field"><span>{label}</span>{children}</label>;
}

function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`settings-toggle ${checked ? "on" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>;
}

function SectionTitle({ title, description, icon }) {
  return <header className="settings-section-title"><span className="settings-section-icon"><Icon name={icon} size={19} /></span><div><h2>{title}</h2><p>{description}</p></div></header>;
}

export default function SettingsPage() {
  const [active, setActive] = useState("profile");
  const [form, setForm] = useState(INITIAL);
  const [saved, setSaved] = useState(true);
  const [notice, setNotice] = useState("");
  const [photo, setPhoto] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flowbase:settings");
      if (stored) setForm({ ...INITIAL, ...JSON.parse(stored) });
      const storedPhoto = localStorage.getItem("flowbase:settings-photo");
      if (storedPhoto) setPhoto(storedPhoto);
    } catch {}
  }, []);

  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setSaved(false); };
  const save = (event) => {
    event.preventDefault();
    try { localStorage.setItem("flowbase:settings", JSON.stringify(form)); } catch {}
    setSaved(true);
    setNotice("Your settings have been saved.");
    window.setTimeout(() => setNotice(""), 2800);
  };
  const uploadPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Choose an image file to upload."); return; }
    const reader = new FileReader();
    reader.onload = () => { const value = String(reader.result); setPhoto(value); try { localStorage.setItem("flowbase:settings-photo", value); } catch {} window.dispatchEvent(new Event("flowbase:profile-photo-updated")); };
    reader.readAsDataURL(file);
  };

  return (
    <main className="settings-page">
      <section className="settings-heading">
        <div className="settings-heading-icon"><Icon name="settings" size={22} /></div>
        <div><div className="settings-eyebrow">PREFERENCES</div><h1>Make Flowbase work your way</h1><p>Update your profile, workspace, and the way you stay informed.</p></div>
        <a className="settings-help" href="mailto:support@flowbase.io"><Icon name="help" size={16} /> Help</a>
      </section>

      <div className="settings-layout">
        <nav className="settings-menu" aria-label="Settings sections">
          <div className="settings-menu-label">SETTINGS MENU</div>
          {SECTIONS.map((section) => <button type="button" key={section.id} className={`settings-menu-item ${active === section.id ? "active" : ""}`} onClick={() => { setActive(section.id); document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span className="settings-menu-icon"><Icon name={section.icon} size={18} /></span><span><strong>{section.title}</strong><small>{section.description}</small></span></button>)}
          <div className="settings-menu-tip"><Icon name="checkCircle" size={17} /><span>Changes are saved to this device.</span></div>
        </nav>

        <form className="settings-content" onSubmit={save}>
          <section className="settings-section" id="profile">
            <SectionTitle title="Profile" description="Your personal details and how they appear to your team." icon="user" />
            <div className="settings-photo-row">
              <div className="settings-photo">{photo ? <img src={photo} alt="Profile" /> : <span>{`${form.firstName?.[0] || "J"}${form.lastName?.[0] || "O"}`}</span>}</div>
              <div className="settings-photo-copy"><strong>Profile photo</strong><small>JPG or PNG · At least 400 × 400 px</small><div className="settings-photo-actions"><button type="button" className="settings-button subtle" onClick={() => fileRef.current?.click()}><Icon name="camera" size={14} /> Upload photo</button><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadPhoto} />{photo && <button type="button" className="settings-text-button" onClick={() => { setPhoto(""); try { localStorage.removeItem("flowbase:settings-photo"); } catch {} window.dispatchEvent(new Event("flowbase:profile-photo-updated")); }}>Remove</button>}</div></div>
              <span className="settings-photo-mark"><Icon name="checkCircle" size={18} /></span>
            </div>
            <div className="settings-fields two-col">
              <Field label="FIRST NAME"><input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} /></Field>
              <Field label="LAST NAME"><input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} /></Field>
              <Field label="WORK EMAIL"><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label="JOB TITLE"><input value={form.title} onChange={(e) => update("title", e.target.value)} /></Field>
              <Field label="PHONE NUMBER"><input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
              <Field label="TIME ZONE"><div className="settings-select-wrap"><Icon name="globe" size={16} /><select value={form.timezone} onChange={(e) => update("timezone", e.target.value)}><option>Africa/Lagos</option><option>Europe/London</option><option>Europe/Paris</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Asia/Dubai</option></select><Icon name="chevron" size={15} /></div></Field>
            </div>
          </section>

          <section className="settings-section" id="workspace">
            <SectionTitle title="Workspace" description="Set up your workspace name and defaults." icon="briefcase" />
            <div className="settings-fields two-col"><Field label="WORKSPACE NAME"><input value={form.workspace} onChange={(e) => update("workspace", e.target.value)} /></Field><Field label="DEFAULT LANGUAGE"><div className="settings-select-wrap"><Icon name="globe" size={16} /><select value={form.language} onChange={(e) => update("language", e.target.value)}><option>English</option><option>French</option><option>Spanish</option></select><Icon name="chevron" size={15} /></div></Field></div>
            <div className="settings-logo-row"><span className="settings-logo-mark"><Icon name="briefcase" size={20} /></span><span><strong>Workspace identity</strong><small>Flowbase workspace · Your team’s shared home</small></span><button type="button" className="settings-button subtle" onClick={() => setNotice("Workspace branding is up to date.")}>Manage</button></div>
          </section>

          <section className="settings-section" id="team-access">
            <SectionTitle title="Team & access" description="Manage your account security and permissions." icon="shield" />
            <div className="settings-row"><span className="settings-row-icon"><Icon name="key" size={17} /></span><span className="settings-row-copy"><strong>Password</strong><small>Last changed 90 days ago</small></span><button type="button" className="settings-button" onClick={() => setNotice("Password management is coming soon.")}>Change password <Icon name="arrow" size={14} /></button></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="lock" size={17} /></span><span className="settings-row-copy"><strong>Two-factor authentication</strong><small>Add another layer of security to your account.</small></span><Toggle checked={form.twoFactor} onChange={(v) => update("twoFactor", v)} label="Two-factor authentication" /></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="user" size={17} /></span><span className="settings-row-copy"><strong>Team members</strong><small>Manage who can access this workspace.</small></span><button type="button" className="settings-button" onClick={() => setNotice("Team access is managed from the Team page.")}>Manage team <Icon name="arrow" size={14} /></button></div>
          </section>

          <section className="settings-section" id="notifications">
            <SectionTitle title="Notifications" description="Choose which updates you receive." icon="bellOn" />
            <div className="settings-row"><span className="settings-row-icon"><Icon name="mail" size={17} /></span><span className="settings-row-copy"><strong>Email updates</strong><small>Important updates about leads and your workspace.</small></span><Toggle checked={form.emailUpdates} onChange={(v) => update("emailUpdates", v)} label="Email updates" /></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="calendar" size={17} /></span><span className="settings-row-copy"><strong>Weekly digest</strong><small>A summary of your team's activity each week.</small></span><Toggle checked={form.weeklyDigest} onChange={(v) => update("weeklyDigest", v)} label="Weekly digest" /></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="bell" size={17} /></span><span className="settings-row-copy"><strong>Product tips</strong><small>Helpful ideas to get more from Flowbase.</small></span><Toggle checked={form.productTips} onChange={(v) => update("productTips", v)} label="Product tips" /></div>
          </section>

          <section className="settings-section" id="integrations">
            <SectionTitle title="Integrations" description="Connect Flowbase to the tools you use every day." icon="plug" />
            <div className="settings-integration"><span className="integration-brand gmail">M</span><span className="settings-row-copy"><strong>Google Workspace</strong><small>Calendar and contacts</small></span><span className="integration-status"><i /> Connected</span><button type="button" className="settings-icon-button" aria-label="Integration options" onClick={() => setNotice("Google Workspace is connected.")}><Icon name="more" size={19} /></button></div>
            <div className="settings-integration"><span className="integration-brand outlook">O</span><span className="settings-row-copy"><strong>Microsoft Outlook</strong><small>Calendar and email</small></span><button type="button" className="settings-button" onClick={() => setNotice("Outlook integration is coming soon.")}><Icon name="link" size={14} /> Connect</button></div>
          </section>

          <section className="settings-section" id="data-privacy">
            <SectionTitle title="Data & privacy" description="Your data stays under your control." icon="lock" />
            <div className="settings-row"><span className="settings-row-icon"><Icon name="download" size={17} /></span><span className="settings-row-copy"><strong>Export your data</strong><small>Download a copy of your Flowbase information.</small></span><button type="button" className="settings-button" onClick={() => setNotice("Your data export is being prepared.")}>Request export <Icon name="download" size={14} /></button></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="trash" size={17} /></span><span className="settings-row-copy"><strong>Account data</strong><small>Review data retention and account options.</small></span><button type="button" className="settings-text-button" onClick={() => setNotice("Contact support to manage account data.")}>Review options</button></div>
          </section>

          <section className="settings-section" id="preferences">
            <SectionTitle title="Preferences" description="Personalize the way Flowbase looks and feels." icon="sliders" />
            <div className="settings-fields two-col"><Field label="APPEARANCE"><div className="settings-select-wrap"><Icon name="moon" size={16} /><select value={form.theme} onChange={(e) => update("theme", e.target.value)}><option>Dark</option><option>System</option><option>Light</option></select><Icon name="chevron" size={15} /></div></Field><Field label="LANGUAGE"><div className="settings-select-wrap"><Icon name="globe" size={16} /><select value={form.language} onChange={(e) => update("language", e.target.value)}><option>English</option><option>French</option><option>Spanish</option></select><Icon name="chevron" size={15} /></div></Field></div>
          </section>

          <footer className="settings-footer"><span className={saved ? "saved" : "unsaved"}><Icon name={saved ? "checkCircle" : "clock"} size={15} />{saved ? "All changes saved" : "You have unsaved changes"}</span><button className="settings-save" type="submit"><Icon name="check" size={16} /> Save changes</button></footer>
        </form>
      </div>
      {notice && <div className="settings-toast" role="status"><Icon name="checkCircle" size={17} />{notice}<button type="button" aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="close" size={16} /></button></div>}
    </main>
  );
}
