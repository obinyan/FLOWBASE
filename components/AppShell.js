"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Logo from "./Logo";
import Icon from "./Icons";
import AddLeadModal from "./AddLeadModal";
import GlobalSearchResults from "./GlobalSearchResults";
import { startSync } from "@/lib/sync";
import { signOutAndClear } from "@/lib/session";

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ back: false, forward: false });
  const [workspaceSection, setWorkspaceSection] = useState("");
  useEffect(() => { startSync(); }, []);
  useEffect(() => { setOpen(false); setQuery(""); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    const sync = () => setWorkspaceSection(pathname.startsWith("/workspace") ? new URLSearchParams(window.location.search).get("tab") || "" : "");
    const onSectionChange = (event) => setWorkspaceSection(event.detail || "");
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("flowbase:workspace-section-changed", onSectionChange);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("flowbase:workspace-section-changed", onSectionChange);
    };
  }, [pathname]);
  useEffect(() => {
    const update = () => setHistoryState({ back: window.history.length > 1, forward: false });
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, [pathname]);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setSearchOpen(false);
      setQuery("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/" || pathname === "/signup") {
    return <>{children}</>;
  }

  return (
    <div className="shell">
      <Sidebar open={open} onClose={() => setOpen(false)} searchQuery={query} onSearchChange={setQuery} />
      <div className="main">
        <div className="mobilebar">
          <div className="mobile-history"><button type="button" aria-label="Go back" disabled={!historyState.back} onClick={() => router.back()}><Icon name="back" size={19} /></button><button type="button" aria-label="Go forward" disabled={!historyState.forward} onClick={() => router.forward()}><Icon name="forward" size={19} /></button></div>
          <Logo />
          <div className="mobile-search">
            <button type="button" className="mobile-search-toggle" aria-label={searchOpen ? "Close search" : "Open search"} aria-expanded={searchOpen} aria-controls="mobile-search-field" onClick={() => { if (searchOpen) setQuery(""); setSearchOpen((value) => !value); }}>
              <Icon name={searchOpen ? "close" : "search"} size={21} />
            </button>
            {searchOpen && <label className="mobile-search-popover" id="mobile-search-field">
              <span className="search"><Icon name="search" size={18} /><input ref={searchRef} type="search" placeholder="Search anything in Flowbase" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search anything in Flowbase" onKeyDown={(event) => event.key === "Escape" && setSearchOpen(false)} /></span>
            </label>}
          </div>
        </div>
        <GlobalSearchResults query={query} onSelect={(href) => {
          if (href?.startsWith("/workspace")) {
            const section = new URL(href, window.location.origin).searchParams.get("tab") || "";
            window.dispatchEvent(new CustomEvent("flowbase:workspace-section-changed", { detail: section }));
          }
          setQuery("");
          setSearchOpen(false);
        }} />
        <Header />
        {children}
        <nav className="bottom-nav" aria-label="Mobile navigation">
          <Link href="/dashboard" className={pathname.startsWith("/dashboard") ? "active" : ""}><Icon name="home" size={22}/><span>Dashboard</span></Link>
          <Link href="/workspace" className={pathname.startsWith("/workspace") && workspaceSection !== "pipeline" ? "active" : ""} onClick={() => window.dispatchEvent(new CustomEvent("flowbase:workspace-section-changed", { detail: "" }))}><Icon name="dashboard" size={22}/><span>Workspace</span></Link>
          <Link href="/workspace?tab=pipeline" className={pathname.startsWith("/workspace") && workspaceSection === "pipeline" ? "active" : ""} onClick={() => window.dispatchEvent(new CustomEvent("flowbase:workspace-section-changed", { detail: "pipeline" }))}><Icon name="pipeline" size={22}/><span>Pipeline</span></Link>
          <Link href="/tasks" className={pathname.startsWith("/tasks") || pathname.startsWith("/calendar") ? "active" : ""}><Icon name="tasks" size={22}/><span>Tasks</span></Link>
          <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}><Icon name="more" size={22}/><span>More</span></button>
        </nav>
        {moreOpen && <><button className="bottom-nav-scrim" aria-label="Close more menu" onClick={() => setMoreOpen(false)} /><div className="bottom-more-menu"><Link href="/calendar" onClick={() => setMoreOpen(false)}><Icon name="calendar" size={18}/>Calendar</Link><Link href="/report" onClick={() => setMoreOpen(false)}><Icon name="report" size={18}/>Reports</Link><Link href="/team" onClick={() => setMoreOpen(false)}><Icon name="leads" size={18}/>Team</Link><Link href="/settings" onClick={() => setMoreOpen(false)}><Icon name="settings" size={18}/>Settings</Link><Link href="/inbox" onClick={() => setMoreOpen(false)}><Icon name="mail" size={18}/>Inbox</Link><button type="button" onClick={() => { setMoreOpen(false); setOpen(true); }}><Icon name="filter" size={18}/>Quick filters</button><button type="button" onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event("flowbase:open-add-lead")); }}><Icon name="plus" size={18}/>Add lead</button><button type="button" onClick={signOutAndClear}><Icon name="lock" size={18}/>Log out</button></div></>}
        <AddLeadModal />
      </div>
    </div>
  );
}
