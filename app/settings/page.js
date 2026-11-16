"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { clearLocalData } from "@/lib/session";
import { saveProfileFromSettings } from "@/lib/profile";
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
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [integrations, setIntegrations] = useState({ google: false, azure: false });
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flowbase:settings");
      if (stored) setForm({ ...INITIAL, ...JSON.parse(stored) });
      const storedPhoto = localStorage.getItem("flowbase:settings-photo");
      if (storedPhoto) setPhoto(storedPhoto);
    } catch {}
    try { const preferences = JSON.parse(localStorage.getItem("flowbase:settings") || "{}"); document.documentElement.dataset.theme = (preferences.theme || "Dark").toLowerCase(); document.documentElement.lang = ({ English: "en", French: "fr", Spanish: "es" })[preferences.language] || "en"; } catch {}
    createClient().auth.getUser().then(({ data }) => { const providers = (data.user?.identities || []).map((identity) => identity.provider); setIntegrations({ google: providers.includes("google"), azure: providers.includes("azure") }); }).catch(() => {});
  }, []);

  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setSaved(false); };
  const save = (event) => {
    event.preventDefault();
    try { localStorage.setItem("flowbase:settings", JSON.stringify(form)); } catch {}
    window.dispatchEvent(new Event("flowbase:settings-updated"));
    saveProfileFromSettings(form);
    document.documentElement.dataset.theme = String(form.theme || "Dark").toLowerCase();
    document.documentElement.lang = ({ English: "en", French: "fr", Spanish: "es" })[form.language] || "en";
    setSaved(true);
    setNotice("Your settings have been saved.");
    window.setTimeout(() => setNotice(""), 2800);
  };
  const exportData = () => {
    const records = {};
    Object.keys(localStorage).filter((key) => key.startsWith("flowbase:")).forEach((key) => { try { records[key] = JSON.parse(localStorage.getItem(key)); } catch { records[key] = localStorage.getItem(key); } });
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: "Flowbase", records }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "flowbase-data-export.json"; link.click(); URL.revokeObjectURL(url);
    setNotice("Your device data export has been downloaded.");
  };
  const connectProvider = async (provider) => {
    try {
      const scopes = provider === "google" ? "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly" : "openid profile email offline_access Calendars.Read User.Read";
      const { error } = await createClient().auth.linkIdentity({ provider, options: { scopes, redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings#integrations")}` } });
      if (error) throw error;
    } catch (error) { setNotice(error.message || "The account connection could not be started. Check provider setup in Supabase."); }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordDraft.length < 8) { setNotice("Use a password with at least 8 characters."); return; }
    const { error } = await createClient().auth.updateUser({ password: passwordDraft });
    if (error) { setNotice(error.message); return; }
    setPasswordOpen(false); setPasswordDraft(""); setNotice("Your password has been updated.");
  };
  const clearDeviceData = () => { if (!window.confirm("Clear Flowbase data cached in this browser? Your Supabase account and server records will remain.")) return; clearLocalData(); window.location.reload(); };
  const goToSection = (id) => { setActive(id); window.setTimeout(() => { const target = document.getElementById(id); target?.scrollIntoView({ behavior: "smooth", block: "start" }); if (id === "workspace") document.getElementById("workspace-name-field")?.focus({ preventScroll: true }); }, 0); };
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
          {SECTIONS.map((section) => <button type="button" key={section.id} className={`settings-menu-item ${active === section.id ? "active" : ""}`} onClick={() => goToSection(section.id)}><span className="settings-menu-icon"><Icon name={section.icon} size={18} /></span><span><strong>{section.title}</strong><small>{section.description}</small></span></button>)}
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
            <div className="settings-fields two-col"><Field label="WORKSPACE NAME"><input id="workspace-name-field" value={form.workspace} onChange={(e) => update("workspace", e.target.value)} /></Field><Field label="DEFAULT LANGUAGE"><div className="settings-select-wrap"><Icon name="globe" size={16} /><select value={form.language} onChange={(e) => update("language", e.target.value)}><option>English</option><option>French</option><option>Spanish</option></select><Icon name="chevron" size={15} /></div></Field></div>
            <div className="settings-logo-row"><span className="settings-logo-mark"><Icon name="briefcase" size={20} /></span><span><strong>Workspace identity</strong><small>Flowbase workspace · Your team’s shared home</small></span><button type="button" className="settings-button subtle" onClick={() => goToSection("workspace")}>Manage</button></div>
          </section>

          <section className="settings-section" id="team-access">
            <SectionTitle title="Team & access" description="Manage your account security and permissions." icon="shield" />
            <div className="settings-row"><span className="settings-row-icon"><Icon name="key" size={17} /></span><span className="settings-row-copy"><strong>Password</strong><small>Last changed 90 days ago</small></span><button type="button" className="settings-button" onClick={() => setPasswordOpen(true)}>Change password <Icon name="arrow" size={14} /></button></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="lock" size={17} /></span><span className="settings-row-copy"><strong>Two-factor authentication</strong><small>Add another layer of security to your account.</small></span><Toggle checked={form.twoFactor} onChange={(v) => update("twoFactor", v)} label="Two-factor authentication" /></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="user" size={17} /></span><span className="settings-row-copy"><strong>Team members</strong><small>Manage who can access this workspace.</small></span><Link className="settings-button" href="/team">Manage team <Icon name="arrow" size={14} /></Link></div>
          </section>

          <section className="settings-section" id="notifications">
            <SectionTitle title="Notifications" description="Choose which updates you receive." icon="bellOn" />
            <div className="settings-row"><span className="settings-row-icon"><Icon name="mail" size={17} /></span><span className="settings-row-copy"><strong>Email updates</strong><small>Important updates about leads and your workspace.</small></span><Toggle checked={form.emailUpdates} onChange={(v) => update("emailUpdates", v)} label="Email updates" /></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="calendar" size={17} /></span><span className="settings-row-copy"><strong>Weekly digest</strong><small>A summary of your team's activity each week.</small></span><Toggle checked={form.weeklyDigest} onChange={(v) => update("weeklyDigest", v)} label="Weekly digest" /></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="bell" size={17} /></span><span className="settings-row-copy"><strong>Product tips</strong><small>Helpful ideas to get more from Flowbase.</small></span><Toggle checked={form.productTips} onChange={(v) => update("productTips", v)} label="Product tips" /></div>
          </section>

          <section className="settings-section" id="integrations">
            <SectionTitle title="Integrations" description="Link Google or Microsoft sign-in identities. Calendar and contact sync still needs provider API setup." icon="plug" />
            <div className="settings-integration"><span className="integration-brand gmail">M</span><span className="settings-row-copy"><strong>Google Workspace</strong><small>Calendar and contacts</small></span><span className="integration-status"><i /> {integrations.google ? "Account linked" : "Not connected"}</span><button type="button" className="settings-button" onClick={() => connectProvider("google")}>{integrations.google ? "Link again" : "Connect Google"}</button></div>
            <div className="settings-integration"><span className="integration-brand outlook">O</span><span className="settings-row-copy"><strong>Microsoft Outlook</strong><small>Calendar and email</small></span><span className="integration-status">{integrations.azure ? "Account linked" : "Not connected"}</span><button type="button" className="settings-button" onClick={() => connectProvider("azure")}>{integrations.azure ? "Link again" : "Connect Outlook"}</button></div>
          </section>

          <section className="settings-section" id="data-privacy">
            <SectionTitle title="Data & privacy" description="Your data stays under your control." icon="lock" />
            <div className="settings-row"><span className="settings-row-icon"><Icon name="download" size={17} /></span><span className="settings-row-copy"><strong>Export your data</strong><small>Download the records and preferences cached in this browser.</small></span><button type="button" className="settings-button" onClick={exportData}>Export data <Icon name="download" size={14} /></button></div>
            <div className="settings-row"><span className="settings-row-icon"><Icon name="trash" size={17} /></span><span className="settings-row-copy"><strong>Clear device cache</strong><small>Remove Flowbase data stored in this browser. Server records remain in your account.</small></span><button type="button" className="settings-button" onClick={clearDeviceData}>Clear cache <Icon name="trash" size={14} /></button></div>
          </section>

          <section className="settings-section" id="preferences">
            <SectionTitle title="Preferences" description="Personalize the way Flowbase looks and feels." icon="sliders" />
            <div className="settings-fields two-col"><Field label="APPEARANCE"><div className="settings-select-wrap"><Icon name="moon" size={16} /><select value={form.theme} onChange={(e) => update("theme", e.target.value)}><option>Dark</option><option>System</option><option>Light</option></select><Icon name="chevron" size={15} /></div></Field><Field label="LANGUAGE"><div className="settings-select-wrap"><Icon name="globe" size={16} /><select value={form.language} onChange={(e) => update("language", e.target.value)}><option>English</option><option>French</option><option>Spanish</option></select><Icon name="chevron" size={15} /></div></Field></div>
          </section>

          <footer className="settings-footer"><span className={saved ? "saved" : "unsaved"}><Icon name={saved ? "checkCircle" : "clock"} size={15} />{saved ? "All changes saved" : "You have unsaved changes"}</span><button className="settings-save" type="submit"><Icon name="check" size={16} /> Save changes</button></footer>
        </form>
      </div>
      {passwordOpen && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasswordOpen(false); }}><section className="pipeline-modal settings-password-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title"><header><div><h2 id="password-modal-title">Change password</h2><p>Set a new password for your Flowbase sign-in.</p></div><button type="button" aria-label="Close" onClick={() => setPasswordOpen(false)}><Icon name="close" size={18}/></button></header><form onSubmit={changePassword}><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} /></label><footer><button type="button" onClick={() => setPasswordOpen(false)}>Cancel</button><button type="submit" className="pipeline-add">Update password</button></footer></form></section></div>}      {notice && <div className="settings-toast" role="status"><Icon name="checkCircle" size={17} />{notice}<button type="button" aria-label="Dismiss" onClick={() => setNotice("")}><Icon name="close" size={16} /></button></div>}
    </main>
  );
}
