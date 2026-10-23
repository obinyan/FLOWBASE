"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";
import { searchPlatform } from "@/lib/platformSearch";

const SEARCH_EVENTS = [
  "flowbase:leads-updated", "flowbase:tasks-updated", "flowbase:calendar-updated",
  "flowbase:inbox-updated", "flowbase:profile-photo-updated", "flowbase:team-updated",
  "flowbase:settings-updated", "flowbase:report-history-updated",
];

function resultIcon(result) {
  if (result.section === "How to") return "settings";
  if (result.section === "Page") {
    return ({ Dashboard: "dashboard", Workspace: "pipeline", Pipeline: "pipeline", Leads: "leads", Clients: "leads", Payments: "report", Calendar: "calendar", Tasks: "tasks", Reports: "report", Inbox: "mail", Team: "leads", Settings: "settings" })[result.title] || "search";
  }
  return ({ Task: "tasks", Calendar: "calendar", Message: "mail", Notification: "bell", "Profile & settings": "user", Report: "report", Team: "leads", Lead: "leads" })[result.section] || "search";
}

export default function GlobalSearchResults({ query, onSelect }) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("storage", refresh);
    SEARCH_EVENTS.forEach((name) => window.addEventListener(name, refresh));
    return () => {
      window.removeEventListener("storage", refresh);
      SEARCH_EVENTS.forEach((name) => window.removeEventListener(name, refresh));
    };
  }, []);

  const results = useMemo(() => searchPlatform(query), [query, revision]);
  if (query.trim().length < 1) return null;

  return (
    <div className="global-search-results" role="region" aria-label="Global search results">
      <div className="global-search-heading"><span>Search results</span><small>{results.length ? `${results.length} found` : "No matches"}</small></div>
      {results.length ? <ul>
        {results.map((result, index) => (
          <li key={`${result.section}-${result.title}-${index}`}>
            <Link href={result.href} onClick={() => onSelect?.(result.href)}>
              <span className="global-search-icon"><Icon name={resultIcon(result)} size={16} /></span>
              <span className="global-search-copy"><b>{result.title}</b><small>{result.section} · {result.detail}</small></span>
              <Icon name="arrow" size={14} />
            </Link>
          </li>
        ))}
      </ul> : <p className="global-search-empty">Try a page, preference, setting, email, task, message, company, or saved detail.</p>}
      <div className="global-search-foot">Searches pages, settings, and saved content across Flowbase</div>
    </div>
  );
}
