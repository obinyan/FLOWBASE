"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icons";
import Link from "next/link";

const DAYS = [15, 19, 17, 27, 21, 31, 26, 34, 29, 39, 32, 41, 35, 44, 39, 46];
const CONVERTED = [5, 6, 5, 9, 8, 11, 9, 13, 11, 16, 13, 18, 15, 20, 18, 24];
const OWNERS = [
  { name: "John", initials: "J", won: 8, conversion: 24, followups: 36, color: "violet", trend: [3, 4, 4, 6, 5, 7, 10] },
  { name: "You", initials: "Y", won: 6, conversion: 20, followups: 29, color: "blue", trend: [2, 3, 3, 5, 4, 7, 9] },
  { name: "Amaka", initials: "A", won: 5, conversion: 16, followups: 22, color: "green", trend: [1, 2, 2, 3, 3, 4, 6] },
  { name: "Tolu", initials: "T", won: 4, conversion: 13, followups: 18, color: "yellow", trend: [1, 2, 2, 2, 3, 3, 5] },
];
const SOURCES = [
  { name: "Instagram", count: 17, color: "#9477ff" },
  { name: "Referral", count: 11, color: "#58c8f0" },
  { name: "Website", count: 8, color: "#53d5aa" },
  { name: "WhatsApp", count: 6, color: "#f4bb4d" },
];
const STAGES = [
  { name: "New", count: 42, color: "#58c8f0" },
  { name: "Contacted", count: 31, color: "#9477ff" },
  { name: "Qualified", count: 22, color: "#f4bb4d" },
  { name: "Proposal", count: 14, color: "#f28d77" },
  { name: "Won", count: 8, color: "#53d5aa" },
];
const PRESETS = { "Last 7 days": 7, "Last 16 days": 16, "Last 30 days": 30, "Last 90 days": 90 };
const money = (value) => `$${Number(value).toLocaleString("en-US")}`;

function linePath(values, width, height, maxValue) {
  return values.map((value, index) => `${index === 0 ? "M" : "L"} ${(index / Math.max(values.length - 1, 1)) * width} ${height - (value / maxValue) * height}`).join(" ");
}

function Sparkline({ values, color }) {
  const path = linePath(values, 88, 24, Math.max(...values) + 1);
  return <svg className={`report-sparkline ${color}`} viewBox="0 0 88 24" aria-label="Recent performance trend"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="88" cy={24 - (values.at(-1) / (Math.max(...values) + 1)) * 24} r="2.6" fill="currentColor"/></svg>;
}

function ActivityChart({ period, source, owner, group }) {
  let newLeads = Array.from({ length: period }, (_, index) => Math.max(1, Math.round(DAYS[index % DAYS.length] * (index >= DAYS.length ? 1.12 : 1))));
  let converted = Array.from({ length: period }, (_, index) => Math.max(1, Math.round(CONVERTED[index % CONVERTED.length] * (index >= CONVERTED.length ? 1.12 : 1))));
  if (source !== "All sources") {
    const share = (SOURCES.find((item) => item.name === source)?.count || 42) / 42;
    newLeads = newLeads.map((value) => Math.max(1, Math.round(value * share)));
    converted = converted.map((value) => Math.max(1, Math.round(value * share)));
  }
  if (owner !== "All owners") {
    const share = (OWNERS.find((item) => item.name === owner)?.won || 23) / 23;
    newLeads = newLeads.map((value) => Math.max(1, Math.round(value * share)));
    converted = converted.map((value) => Math.max(1, Math.round(value * share)));
  }
  const groupedNew = group === "Daily" ? newLeads : Array.from({ length: Math.max(1, Math.ceil(period / 7)) }, (_, index) => newLeads.slice(index * 7, index * 7 + 7).reduce((sum, item) => sum + item, 0));
  const groupedConverted = group === "Daily" ? converted : Array.from({ length: Math.max(1, Math.ceil(period / 7)) }, (_, index) => converted.slice(index * 7, index * 7 + 7).reduce((sum, item) => sum + item, 0));
  const width = 640;
  const height = 150;
  const maxValue = Math.max(...groupedNew, ...groupedConverted, 10) + 4;
  const newPath = linePath(groupedNew, width, height, maxValue);
  const convertedPath = linePath(groupedConverted, width, height, maxValue);
  const newPoints = groupedNew.map((value, index) => ({ x: (index / Math.max(groupedNew.length - 1, 1)) * width, y: height - (value / maxValue) * height }));
  const convertedPoints = groupedConverted.map((value, index) => ({ x: (index / Math.max(groupedConverted.length - 1, 1)) * width, y: height - (value / maxValue) * height }));
  const ticks = group === "Daily" ? groupedNew.map((_, index) => period === 16 ? `Oct ${index + 1}` : `Day ${index + 1}`).filter((_, index) => index === 0 || index === groupedNew.length - 1 || index % Math.max(1, Math.floor(groupedNew.length / 5)) === 0) : groupedNew.map((_, index) => `Week ${index + 1}`).filter((_, index) => index === 0 || index === groupedNew.length - 1 || index % 2 === 0);

  return <div className="report-chart-wrap"><div className="report-chart-legend"><span><i className="legend-violet" />New leads</span><span><i className="legend-blue" />Converted</span></div><div className="report-line-chart"><div className="chart-y-labels"><span>{maxValue}</span><span>{Math.round(maxValue * .75)}</span><span>{Math.round(maxValue * .5)}</span><span>{Math.round(maxValue * .25)}</span><span>0</span></div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Lead additions and conversions over time"><defs><linearGradient id="newFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9477ff" stopOpacity=".19"/><stop offset="1" stopColor="#9477ff" stopOpacity="0"/></linearGradient></defs>{[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} className="chart-grid-line"/>)}<path d={`${newPath} L ${width} ${height} L 0 ${height} Z`} fill="url(#newFill)"/><path d={newPath} className="chart-line new-line"/><path d={convertedPath} className="chart-line converted-line"/>{newPoints.filter((_, index) => index % Math.max(1, Math.floor(newPoints.length / 5)) === 0 || index === newPoints.length - 1).map((point, index) => <circle key={`n${index}`} cx={point.x} cy={point.y} r="3.2" className="chart-dot new-dot"/>)}{convertedPoints.filter((_, index) => index % Math.max(1, Math.floor(convertedPoints.length / 5)) === 0 || index === convertedPoints.length - 1).map((point, index) => <circle key={`c${index}`} cx={point.x} cy={point.y} r="3" className="chart-dot converted-dot"/>)}</svg></div><div className="chart-x-labels">{ticks.map((tick, index) => <span key={`${tick}-${index}`}>{tick}</span>)}</div></div>;
}

export default function ReportsBoard() {
  const [range, setRange] = useState("Last 16 days");
  const [group, setGroup] = useState("Daily");
  const [pipelinePeriod, setPipelinePeriod] = useState("This month");
  const [source, setSource] = useState("All sources");
  const [owner, setOwner] = useState("All owners");
  const [quickOpen, setQuickOpen] = useState(null);
  const period = PRESETS[range];
  const rangeStart = period === 7 ? "Oct 10" : period === 16 ? "Oct 1" : period === 30 ? "Sep 17" : "Jul 19";
  const factor = period / 16;
  const filtersActive = source !== "All sources" || owner !== "All owners";
  const scopedOwner = owner === "All owners" ? null : OWNERS.find((item) => item.name === owner);
  const scopedSource = source === "All sources" ? null : SOURCES.find((item) => item.name === source);
  const leadCount = Math.max(1, Math.round((scopedSource?.count || scopedOwner?.followups || 42) * factor));
  const conversionRate = scopedOwner?.conversion || (filtersActive ? 18 : 18);
  const wonValue = Math.round((scopedOwner ? scopedOwner.won * 3100 : scopedSource ? scopedSource.count * 590 : 24800) * factor);
  const closeDays = scopedOwner ? 6 + (24 - scopedOwner.conversion) * .15 : 8.4;
  const sourceRows = useMemo(() => {
    const rows = source === "All sources" ? SOURCES : SOURCES.filter((item) => item.name === source);
    return rows.map((item) => ({ ...item, count: Math.max(1, Math.round(item.count * factor * (scopedOwner ? scopedOwner.followups / 36 : 1))) }));
  }, [source, factor, scopedOwner]);
  const sourceTotal = sourceRows.reduce((total, item) => total + item.count, 0) || 1;
  const stageRows = STAGES.map((item) => ({ ...item, count: Math.max(1, Math.round(item.count * factor * (scopedOwner ? scopedOwner.won / 8 : 1) * (scopedSource ? scopedSource.count / 17 : 1))) }));
  const stagePeriodFactor = pipelinePeriod === "This quarter" ? 2.2 : pipelinePeriod === "This year" ? 4.8 : 1;
  const periodStageRows = stageRows.map((item) => ({ ...item, count: Math.round(item.count * stagePeriodFactor) }));
  const stageTotal = periodStageRows[0]?.count || 1;
  const teamRows = owner === "All owners" ? OWNERS : OWNERS.filter((item) => item.name === owner);

  const exportReport = () => {
    const csv = [
      ["Flowbase report", range, `Source: ${source}`, `Owner: ${owner}`].join(","),
      ["Metric", "Value"].join(","),
      ["Leads added", leadCount], ["Conversion rate", `${conversionRate}%`], ["Won value", money(wonValue)], ["Average time to close", `${closeDays.toFixed(1)} days`].join(","),
      ["Pipeline stage", "Lead count", "Conversion"].join(","),
      ...periodStageRows.map((item) => [item.name, item.count, `${Math.round(item.count / stageTotal * 100)}%`].join(",")),
      ["Source", "Leads", "Share"].join(","),
      ...sourceRows.map((item) => [item.name, item.count, `${Math.round(item.count / sourceTotal * 100)}%`].join(",")),
      ["Owner", "Leads won", "Conversion", "Follow-ups"].join(","),
      ...teamRows.map((item) => [item.name, item.won, `${item.conversion}%`, item.followups].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flowbase-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="reports-page">
    <section className="reports-heading panel"><div><h1>Reports</h1><p>Understand what is moving your pipeline forward.</p></div><div className="reports-heading-actions"><Link href="/inbox" className="reports-inbox-link"><Icon name="mail" size={15} />Inbox</Link><div className="report-date-wrap"><button type="button" className="report-date-button" aria-expanded={quickOpen === "range"} onClick={() => setQuickOpen(quickOpen === "range" ? null : "range")}><Icon name="calendar" size={14} />{rangeStart} – Oct 16<Icon name="chevron" size={12} /></button>{quickOpen === "range" && <div className="report-filter-popover">{Object.keys(PRESETS).map((preset) => <button type="button" key={preset} onClick={() => { setRange(preset); setQuickOpen(null); }}>{preset}</button>)}</div>}</div><button type="button" className="reports-export" onClick={exportReport}><Icon name="download" size={15} />Export</button></div></section>
    <section className="reports-overview"><div className="reports-overview-top"><div><span className="reports-eyebrow">PERFORMANCE OVERVIEW</span><h2>See the story behind your sales</h2><p>Lead activity and conversion for {rangeStart}–Oct 16, 2026.</p></div><div className="reports-range-control"><Icon name="clock" size={15} /><select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Report date range">{Object.keys(PRESETS).map((preset) => <option key={preset}>{preset}</option>)}</select><Icon name="chevron" size={13} /></div></div>
      <div className="reports-quick-filters"><span>QUICK FILTERS</span><label><Icon name="calendar" size={14} /><select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Filter by date range"><option value="Last 16 days">This month</option><option value="Last 7 days">Last 7 days</option><option value="Last 30 days">Last 30 days</option><option value="Last 90 days">This quarter</option></select><Icon name="chevron" size={12} /></label><div className="report-filter-wrap"><button type="button" className={source !== "All sources" ? "active" : ""} onClick={() => setQuickOpen(quickOpen === "source" ? null : "source")}><Icon name="leads" size={14} />{source === "All sources" ? "By source" : source}<Icon name="chevron" size={12} /></button>{quickOpen === "source" && <div className="report-filter-popover">{["All sources", ...SOURCES.map((item) => item.name)].map((item) => <button type="button" key={item} onClick={() => { setSource(item); setQuickOpen(null); }}>{item}</button>)}</div>}</div><div className="report-filter-wrap"><button type="button" className={owner !== "All owners" ? "active" : ""} onClick={() => setQuickOpen(quickOpen === "owner" ? null : "owner")}><Icon name="leads" size={14} />{owner === "All owners" ? "By owner" : owner}<Icon name="chevron" size={12} /></button>{quickOpen === "owner" && <div className="report-filter-popover">{["All owners", ...OWNERS.map((item) => item.name)].map((item) => <button type="button" key={item} onClick={() => { setOwner(item); setQuickOpen(null); }}>{item}</button>)}</div>}</div>{filtersActive && <button className="report-clear-filters" type="button" onClick={() => { setSource("All sources"); setOwner("All owners"); }}>Clear</button>}</div>
      <div className="reports-stats"><article className="report-stat" style={{ "--report-stat-color": "#58c8f0" }}><span>LEADS ADDED</span><strong>{leadCount}</strong><small><Icon name="trend" size={12} />18% vs previous period</small></article><article className="report-stat" style={{ "--report-stat-color": "#9477ff" }}><span>CONVERSION RATE</span><strong>{conversionRate}%</strong><small><Icon name="trend" size={12} />3.2 pts</small></article><article className="report-stat" style={{ "--report-stat-color": "#53d5aa" }}><span>WON VALUE</span><strong>{money(wonValue)}</strong><small><Icon name="trend" size={12} />12% vs previous period</small></article><article className="report-stat" style={{ "--report-stat-color": "#f4bb4d" }}><span>AVG. TIME TO CLOSE</span><strong>{closeDays.toFixed(1)} days</strong><small><Icon name="trend" size={12} className="down-trend" />1.2 days</small></article></div>
    </section>

    <div className="reports-row reports-row-top"><section className="report-panel activity-report"><header className="report-panel-header"><div><h3>Lead activity</h3><p>New leads and conversions over time</p></div><label><select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Group lead activity"><option>Daily</option><option>Weekly</option></select><Icon name="chevron" size={12} /></label></header><ActivityChart period={period} source={source} owner={owner} group={group} /></section>
      <section className="report-panel conversion-report"><header className="report-panel-header"><div><h3>Pipeline conversion</h3><p>Lead progression by stage</p></div><label><select value={pipelinePeriod} onChange={(event) => setPipelinePeriod(event.target.value)} aria-label="Pipeline reporting period"><option>This month</option><option>This quarter</option><option>This year</option></select><Icon name="chevron" size={12} /></label></header><div className="conversion-bars">{periodStageRows.map((item) => { const percent = Math.round(item.count / stageTotal * 100); return <div className="conversion-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${percent}%`, background: item.color }} /></div><b>{item.count}</b><small>{percent}%</small></div>; })}</div><footer>{stageTotal} leads entered {pipelinePeriod.toLowerCase()}</footer></section></div>

    <div className="reports-row reports-row-bottom"><section className="report-panel sources-report"><header className="report-panel-header"><div><h3>Lead sources</h3><p>Where your leads come from</p></div></header><div className="sources-layout"><div className="source-donut" style={{ background: `conic-gradient(${sourceRows.map((item, index) => { const before = sourceRows.slice(0, index).reduce((sum, row) => sum + row.count, 0) / sourceTotal * 100; const after = (sourceRows.slice(0, index + 1).reduce((sum, row) => sum + row.count, 0) / sourceTotal * 100); return `${item.color} ${before}% ${after}%`; }).join(",")})` }}><div><strong>{sourceTotal}</strong><small>LEADS</small></div></div><div className="source-legend">{sourceRows.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{item.count}</b><small>{Math.round(item.count / sourceTotal * 100)}%</small></div>)}</div></div></section>
      <section className="report-panel team-report"><header className="report-panel-header"><div><h3>Team performance</h3><p>Leads won and follow-up activity</p></div></header><div className="team-report-scroll"><table className="team-report-table"><thead><tr><th>OWNER</th><th>LEADS WON</th><th>CONVERSION</th><th>FOLLOW-UPS</th><th>TREND</th></tr></thead><tbody>{teamRows.map((person) => <tr key={person.name}><td><span className={`owner-avatar ${person.color}`}>{person.initials}</span><b>{person.name}</b></td><td>{person.won}</td><td>{person.conversion}%</td><td>{person.followups}</td><td><Sparkline values={person.trend} color={person.color} /></td></tr>)}</tbody></table></div><footer>Updated moments ago · Compare across any date range</footer></section></div>
  </div>;
}
