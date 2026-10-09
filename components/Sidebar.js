"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "./Icons";
import Logo from "./Logo";
import { NAV } from "@/lib/data";
import { QUICK_FILTERS, UPGRADE_URL, LEARN_MORE_URL } from "@/lib/config";

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Primary">
        <div className="sidebar-logo"><Logo /></div>

        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Search" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
        </label>

        <nav className="nav primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`nav-item ${isActive(item.href) ? "active" : ""}`}
              aria-current={isActive(item.href) ? "page" : undefined}>
              <Icon name={item.icon} size={28} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <hr className="divider" />

        <button type="button" className="quick-toggle" aria-expanded={filtersOpen}
          aria-controls="quick-filters" onClick={() => setFiltersOpen((v) => !v)}>
          <span>Quick filters</span>
          <Icon name="chevron" size={18} className={`chev ${filtersOpen ? "up" : ""}`} />
        </button>
        <div id="quick-filters" className={`quick-list ${filtersOpen ? "open" : ""}`}>
          <div className="quick-inner">
            {QUICK_FILTERS.map((f) => (
              <Link key={f.label} href={f.href} className="quick-item" onClick={onClose}
                tabIndex={filtersOpen ? 0 : -1}>{f.label}</Link>
            ))}
          </div>
        </div>

        <nav className="nav secondary">
          <Link href="/team" onClick={onClose} className={`nav-item small ${isActive("/team") ? "active" : ""}`}>
            <Icon name="leads" size={26} /><span>Team</span>
          </Link>
          <Link href="/settings" onClick={onClose} className={`nav-item small ${isActive("/settings") ? "active" : ""}`}>
            <Icon name="settings" size={26} /><span>Settings</span>
          </Link>
        </nav>

        <div className="hub-card">
          <h3>Interested in the Hub?</h3>
          <p>Unlock analysis and pitch tools.</p>
          <div className="hub-actions">
            <a href={UPGRADE_URL} className="btn-upgrade"><span aria-hidden="true">👑</span> Upgrade</a>
            <a href={LEARN_MORE_URL} className="btn-learn">Learn more</a>
          </div>
        </div>
      </aside>
    </>
  );
}
