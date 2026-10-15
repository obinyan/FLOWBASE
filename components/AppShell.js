"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Logo from "./Logo";
import Icon from "./Icons";

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/" || pathname === "/signup") {
    return <>{children}</>;
  }

  return (
    <div className="shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main">
        <div className="mobilebar">
          <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" size={26} />
          </button>
          <Logo />
          <div className="mobile-search">
            <button type="button" className="mobile-search-toggle" aria-label={searchOpen ? "Close search" : "Open search"} aria-expanded={searchOpen} aria-controls="mobile-search-field" onClick={() => setSearchOpen((value) => !value)}>
              <Icon name={searchOpen ? "close" : "search"} size={21} />
            </button>
            {searchOpen && <label className="mobile-search-popover" id="mobile-search-field">
              <span className="search"><Icon name="search" size={18} /><input ref={searchRef} type="search" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search" onKeyDown={(event) => event.key === "Escape" && setSearchOpen(false)} /></span>
            </label>}
          </div>
        </div>
        <Header />
        {children}
      </div>
    </div>
  );
}
