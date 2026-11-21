"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icons";
import Link from "next/link";
import { readLeads } from "@/lib/leads";
import { formatCurrency, useWorkspaceCurrency } from "@/lib/currency";

const SOURCE_COLORS = ["#5478ff", "#7c9dff", "#93b8ff", "#b0c7ff", "#667eea"];
const STAGES = [
  { name: "New", count: 42, color: "#58c8f0" },
  { name: "Contacted", count: 31, color: "#9477ff" },
  { name: "Qualified", count: 22, color: "#f4bb4d" },
  { name: "Proposal", count: 14, color: "#f28d77" },
  { name: "Won", count: 8, color: "#53d5aa" },
];
const PRESETS = { "Last 7 days": 7, "Last 16 days": 16, "Last 30 days": 30, "Last 90 days": 90 };
const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function linePath(values, width, height, maxValue) {
  return values.map((value, index) => `${index === 0 ? "M" : "L"} ${(index / Math.max(values.length - 1, 1)) * width} ${height - (value / maxValue) * height}`).join(" ");
}

function Sparkline({ values, color }) {
  const path = linePath(values, 88, 24, Math.max(...values) + 1);
  return <svg className={`report-sparkline ${color}`} viewBox="0 0 88 24" aria-label="Recent performance trend"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="88" cy={24 - (values.at(-1) / (Math.max(...values) + 1)) * 24} r="2.6" fill="currentColor"/></svg>;
}

function ActivityChart({ leads, period, group }) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - period + 1);
  const days = Array.from({ length: period }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDateKey(date);
  });
  const newLeads = days.map((day) => leads.filter((lead) => lead.createdAt?.slice(0, 10) === day).length);
  const converted = days.map((day) => leads.filter((lead) => lead.stage === "Won" && (lead.updatedAt || lead.createdAt)?.slice(0, 10) === day).length);
  const groupedNew = group === "Daily" ? newLeads : Array.from({ length: Math.max(1, Math.ceil(period / 7)) }, (_, index) => newLeads.slice(index * 7, index * 7 + 7).reduce((sum, item) => sum + item, 0));
  const groupedConverted = group === "Daily" ? converted : Array.from({ length: Math.max(1, Math.ceil(period / 7)) }, (_, index) => converted.slice(index * 7, index * 7 + 7).reduce((sum, item) => sum + item, 0));
  const width = 640;
  const height = 150;
  const maxValue = Math.max(...groupedNew, ...groupedConverted, 10) + 4;
  const newPath = linePath(groupedNew, width, height, maxValue);
  const convertedPath = linePath(groupedConverted, width, height, maxValue);
  const newPoints = groupedNew.map((value, index) => ({ x: (index / Math.max(groupedNew.length - 1, 1)) * width, y: height - (value / maxValue) * height }));
  const convertedPoints = groupedConverted.map((value, index) => ({ x: (index / Math.max(groupedConverted.length - 1, 1)) * width, y: height - (value / maxValue) * height }));
  const ticks = group === "Daily" ? groupedNew.map((_, index) => new Date(`${days[index]}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })).filter((_, index) => index === 0 || index === groupedNew.length - 1 || index % Math.max(1, Math.floor(groupedNew.length / 5)) === 0) : groupedNew.map((_, index) => `Week ${index + 1}`).filter((_, index) => index === 0 || index === groupedNew.length - 1 || index % 2 === 0);

  return <div className="report-chart-wrap"><div className="report-chart-legend"><span><i className="legend-violet" />New leads</span><span><i className="legend-blue" />Converted</span></div><div className="report-line-chart"><div className="chart-y-labels"><span>{maxValue}</span><span>{Math.round(maxValue * .75)}</span><span>{Math.round(maxValue * .5)}</span><span>{Math.round(maxValue * .25)}</span><span>0</span></div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Lead additions and conversions over time"><defs><linearGradient id="newFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9477ff" stopOpacity=".19"/><stop offset="1" stopColor="#9477ff" stopOpacity="0"/></linearGradient></defs>{[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} className="chart-grid-line"/>)}<path d={`${newPath} L ${width} ${height} L 0 ${height} Z`} fill="url(#newFill)"/><path d={newPath} className="chart-line new-line"/><path d={convertedPath} className="chart-line converted-line"/>{newPoints.filter((_, index) => index % Math.max(1, Math.floor(newPoints.length / 5)) === 0 || index === newPoints.length - 1).map((point, index) => <circle key={`n${index}`} cx={point.x} cy={point.y} r="3.2" className="chart-dot new-dot"/>)}{convertedPoints.filter((_, index) => index % Math.max(1, Math.floor(convertedPoints.length / 5)) === 0 || index === convertedPoints.length - 1).map((point, index) => <circle key={`c${index}`} cx={point.x} cy={point.y} r="3" className="chart-dot converted-dot"/>)}</svg></div><div className="chart-x-labels">{ticks.map((tick, index) => <span key={`${tick}-${index}`}>{tick}</span>)}</div></div>;
}

export default function ReportsBoard() {
  const workspaceCurrency = useWorkspaceCurrency();
  const money = (value) => formatCurrency(value, workspaceCurrency);
  const [range, setRange] = useState("Last 16 days");
  const [group, setGroup] = useState("Daily");
  const [pipelinePeriod, setPipelinePeriod] = useState("This month");
  const [source, setSource] = useState("All sources");
  const [owner, setOwner] = useState("All owners");
  const [quickOpen, setQuickOpen] = useState(null);
  const [analysisQuestion, setAnalysisQuestion] = useState("");
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [reportLeads, setReportLeads] = useState([]);
  const OWNERS = [...new Set(reportLeads.map((lead) => lead.owner).filter(Boolean))].map((name, index) => ({ name, initials: name[0]?.toUpperCase() || "?", color: ["blue", "violet", "green", "yellow"][index % 4], trend: Array(7).fill(0) }));
  const SOURCES = [...new Set(reportLeads.map((lead) => lead.source).filter(Boolean))].map((name, index) => ({ name, color: SOURCE_COLORS[index % SOURCE_COLORS.length] }));
  useEffect(() => {
    const refresh = () => setReportLeads(readLeads());
    refresh();
    try { setAnalysisHistory(JSON.parse(localStorage.getItem("flowbase:analysis-history:v1") || "[]")); } catch {}
    const refreshHistory = () => { try { setAnalysisHistory(JSON.parse(localStorage.getItem("flowbase:analysis-history:v1") || "[]")); } catch {} };
    window.addEventListener("flowbase:records-ready", refreshHistory);
    window.addEventListener("flowbase:report-history-updated", refreshHistory);
    window.addEventListener("flowbase:leads-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("flowbase:records-ready", refreshHistory); window.removeEventListener("flowbase:report-history-updated", refreshHistory); window.removeEventListener("flowbase:leads-updated", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const period = PRESETS[range];
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - period + 1);
  const rangeStart = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const filtersActive = source !== "All sources" || owner !== "All owners";
  const scopedOwner = owner === "All owners" ? null : OWNERS.find((item) => item.name === owner);
  const scopedSource = source === "All sources" ? null : SOURCES.find((item) => item.name === source);
  const matchingLeads = reportLeads.filter((lead) => (source === "All sources" || lead.source === source) && (owner === "All owners" || lead.owner === owner));
  const fromDate = localDateKey(startDate);
  const toDate = localDateKey(endDate);
  const rangeLeads = matchingLeads.filter((lead) => !lead.createdAt || (lead.createdAt.slice(0, 10) >= fromDate && lead.createdAt.slice(0, 10) <= toDate));
  const leadCount = rangeLeads.length;
  const wonLeads = rangeLeads.filter((lead) => lead.stage === "Won");
  const conversionRate = leadCount ? Math.round(wonLeads.length / leadCount * 100) : 0;
  const wonValue = wonLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const closeDays = (() => {
    const durations = wonLeads.map((lead) => {
      const created = new Date(lead.createdAt || "");
      const closed = new Date(lead.updatedAt || lead.createdAt || "");
      return Number.isFinite(created.getTime()) && Number.isFinite(closed.getTime())
        ? Math.max(0, (closed - created) / 86400000) : null;
    }).filter((value) => value !== null);
    return durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;
  })();
  const sourceRows = useMemo(() => {
    const rows = source === "All sources" ? SOURCES : SOURCES.filter((item) => item.name === source);
    return rows.map((item) => ({ ...item, count: reportLeads.filter((lead) => lead.source === item.name && (owner === "All owners" || lead.owner === owner)).length }));
  }, [source, owner, reportLeads]);
  const sourceTotal = sourceRows.reduce((total, item) => total + item.count, 0);
  const pipelineStart = new Date();
  pipelineStart.setHours(0, 0, 0, 0);
  if (pipelinePeriod === "This year") pipelineStart.setMonth(0, 1);
  else if (pipelinePeriod === "This quarter") pipelineStart.setMonth(Math.floor(pipelineStart.getMonth() / 3) * 3, 1);
  else pipelineStart.setDate(1);
  const periodPipelineLeads = matchingLeads.filter((lead) => lead.createdAt && new Date(lead.createdAt) >= pipelineStart);
  const periodStageRows = STAGES.map((item) => ({ ...item, count: periodPipelineLeads.filter((lead) => lead.stage === item.name).length }));
  const stageTotal = periodStageRows.reduce((sum, item) => sum + item.count, 0);
  const teamRows = (owner === "All owners" ? OWNERS : OWNERS.filter((item) => item.name === owner)).map((person) => {
    const owned = reportLeads.filter((lead) => lead.owner === person.name);
    const won = owned.filter((lead) => lead.stage === "Won");
    const trend = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
      const next = new Date(day); next.setDate(next.getDate() + 1);
      return won.filter((lead) => lead.updatedAt && new Date(lead.updatedAt) >= day && new Date(lead.updatedAt) < next).length;
    });
    return { ...person, won: won.length, conversion: owned.length ? Math.round(won.length / owned.length * 100) : 0, followups: owned.filter((lead) => lead.followUpDate).length, trend };
  });

  const exportReport = () => {
    const csv = [
      ["Flowbase report", range, `Source: ${source}`, `Owner: ${owner}`].join(","),
      ["Metric", "Value"].join(","),
      ["Leads added", leadCount], ["Conversion rate", `${conversionRate}%`], ["Won value", money(wonValue)], ["Average time to close", closeDays === null ? "No data" : `${closeDays.toFixed(1)} days`].join(","),
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

  const analyze = (event) => {
    event.preventDefault();
    const question = analysisQuestion.trim();
    if (!question) return;
    const normalized = question.toLowerCase();
    const total = reportLeads.length;
    let result;
    if (/(how many|count|number|total).*(lead|customer|prospect)|(lead|customer|prospect).*(how many|count|number|total)/.test(normalized)) {
      result = { summary: `There ${total === 1 ? "is" : "are"} ${total} lead${total === 1 ? "" : "s"} in your workspace.`, details: `Across the current pipeline: ${STAGES.map((stage) => `${stage.name}: ${reportLeads.filter((lead) => lead.stage === stage.name).length}`).join(" · ")}.`, metric: `${total} leads` };
    } else if (/(source|channel|where.*from)/.test(normalized)) {
      const counts = reportLeads.reduce((map, lead) => { const key = lead.source || "Other"; map[key] = (map[key] || 0) + 1; return map; }, {});
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      result = top ? { summary: `${top[0]} is your most common lead source with ${top[1]} lead${top[1] === 1 ? "" : "s"}.`, details: Object.entries(counts).map(([key, value]) => `${key}: ${value}`).join(" · "), metric: `${Object.keys(counts).length} sources` } : { summary: "There are no leads to compare yet.", details: "Add leads with a source to see channel performance.", metric: "0 leads" };
    } else if (/(conversion|won|close|success)/.test(normalized)) {
      const won = reportLeads.filter((lead) => lead.stage === "Won");
      const rate = total ? Math.round(won.length / total * 100) : 0;
      result = { summary: `Your current win rate is ${rate}% (${won.length} won of ${total} total leads).`, details: `Open pipeline: ${total - won.length} · Won value: ${money(won.reduce((sum, lead) => sum + Number(lead.value || 0), 0))}.`, metric: `${rate}% win rate` };
    } else if (/(value|revenue|pipeline|amount)/.test(normalized)) {
      const amount = reportLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
      const open = reportLeads.filter((lead) => lead.stage !== "Won").reduce((sum, lead) => sum + Number(lead.value || 0), 0);
      result = { summary: `Your pipeline is valued at ${money(amount)}.`, details: `Open opportunities: ${money(open)} · Won: ${money(amount - open)}.`, metric: money(amount) };
    } else if (/(priority|urgent|high|follow.?up|overdue)/.test(normalized)) {
      const prioritized = reportLeads.filter((lead) => lead.priority || lead.followUpDate);
      result = { summary: `${prioritized.length} lead${prioritized.length === 1 ? "" : "s"} ${prioritized.length === 1 ? "has" : "have"} a priority flag or follow-up date.`, details: prioritized.length ? prioritized.map((lead) => `${lead.name}${lead.followUp ? ` · ${lead.followUp}` : ""}`).join(" · ") : "No priority or follow-up leads are recorded yet.", metric: `${prioritized.length} to review` };
    } else if (/(stage|stages|progress)/.test(normalized)) {
      const counts = STAGES.map((stage) => ({ name: stage.name, count: reportLeads.filter((lead) => lead.stage === stage.name).length }));
      const biggest = counts.sort((a, b) => b.count - a.count)[0];
      result = { summary: total ? `${biggest.name} has the most leads (${biggest.count}).` : "Your pipeline is empty and ready for its first lead.", details: counts.map((item) => `${item.name}: ${item.count}`).join(" · "), metric: `${total} leads` };
    } else {
      result = { summary: "Try asking about lead counts, sources, stages, conversion, pipeline value, priority, or follow-ups.", details: "Analysis uses the lead details saved in Flowbase. Add lead data for more specific results.", metric: `${total} available` };
    }
    const record = { id: crypto.randomUUID(), question, ...result, createdAt: new Date().toISOString() };
    setAnalysisResult(record);
        setAnalysisHistory((current) => { const next = [record, ...current].slice(0, 50); try { localStorage.setItem("flowbase:analysis-history:v1", JSON.stringify(next)); } catch {} window.dispatchEvent(new Event("flowbase:report-history-updated")); return next; });
    setAnalysisQuestion("");
  };
  const exportAnalysis = (item) => {
    const csv = [["Question", "Analysis", "Details", "Metric", "Created"], [item.question, item.summary, item.details, item.metric, new Date(item.createdAt).toLocaleString()]].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "flowbase-lead-analysis.csv"; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="reports-page">
    <section className="reports-heading panel"><div><h1>Reports</h1><p>Understand what is moving your pipeline forward.</p></div><div className="reports-heading-actions"><Link href="/inbox" className="reports-inbox-link"><Icon name="mail" size={15} />Inbox</Link><div className="report-date-wrap"><button type="button" className="report-date-button" aria-expanded={quickOpen === "range"} onClick={() => setQuickOpen(quickOpen === "range" ? null : "range")}><Icon name="calendar" size={14} />{rangeStart} – {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}<Icon name="chevron" size={12} /></button>{quickOpen === "range" && <div className="report-filter-popover">{Object.keys(PRESETS).map((preset) => <button type="button" key={preset} onClick={() => { setRange(preset); setQuickOpen(null); }}>{preset}</button>)}</div>}</div><button type="button" className="reports-export" onClick={exportReport}><Icon name="download" size={15} />Export</button></div></section>
    <section className="reports-overview"><div className="reports-overview-top"><div><span className="reports-eyebrow">PERFORMANCE OVERVIEW</span><h2>See the story behind your sales</h2><p>Lead activity and conversion for {rangeStart}–{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.</p></div><div className="reports-range-control"><Icon name="clock" size={15} /><select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Report date range">{Object.keys(PRESETS).map((preset) => <option key={preset}>{preset}</option>)}</select><Icon name="chevron" size={13} /></div></div>
      <div className="reports-quick-filters"><span>QUICK FILTERS</span><label><Icon name="calendar" size={14} /><select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Filter by date range"><option value="Last 16 days">This month</option><option value="Last 7 days">Last 7 days</option><option value="Last 30 days">Last 30 days</option><option value="Last 90 days">This quarter</option></select><Icon name="chevron" size={12} /></label><div className="report-filter-wrap"><button type="button" className={source !== "All sources" ? "active" : ""} onClick={() => setQuickOpen(quickOpen === "source" ? null : "source")}><Icon name="leads" size={14} />{source === "All sources" ? "By source" : source}<Icon name="chevron" size={12} /></button>{quickOpen === "source" && <div className="report-filter-popover">{["All sources", ...SOURCES.map((item) => item.name)].map((item) => <button type="button" key={item} onClick={() => { setSource(item); setQuickOpen(null); }}>{item}</button>)}</div>}</div><div className="report-filter-wrap"><button type="button" className={owner !== "All owners" ? "active" : ""} onClick={() => setQuickOpen(quickOpen === "owner" ? null : "owner")}><Icon name="leads" size={14} />{owner === "All owners" ? "By owner" : owner}<Icon name="chevron" size={12} /></button>{quickOpen === "owner" && <div className="report-filter-popover">{["All owners", ...OWNERS.map((item) => item.name)].map((item) => <button type="button" key={item} onClick={() => { setOwner(item); setQuickOpen(null); }}>{item}</button>)}</div>}</div>{filtersActive && <button className="report-clear-filters" type="button" onClick={() => { setSource("All sources"); setOwner("All owners"); }}>Clear</button>}</div>
      <div className="reports-stats"><article className="report-stat" style={{ "--report-stat-color": "#58c8f0" }}><span>LEADS ADDED</span><strong>{leadCount}</strong></article><article className="report-stat" style={{ "--report-stat-color": "#9477ff" }}><span>CONVERSION RATE</span><strong>{conversionRate}%</strong></article><article className="report-stat" style={{ "--report-stat-color": "#53d5aa" }}><span>WON VALUE</span><strong>{money(wonValue)}</strong></article><article className="report-stat" style={{ "--report-stat-color": "#f4bb4d" }}><span>AVG. TIME TO CLOSE</span><strong>{closeDays === null ? "—" : `${closeDays.toFixed(1)} days`}</strong></article></div>
    </section>

    <section className="report-panel report-analysis"><header className="report-panel-header"><div><h3>Lead analysis</h3></div></header><form className="analysis-query" onSubmit={analyze}><Icon name="search" size={17} /><input value={analysisQuestion} onChange={(event) => setAnalysisQuestion(event.target.value)} aria-label="Ask a lead analysis question" /><button className="reports-export" type="submit"><Icon name="trend" size={14} />Analyze</button></form><div className="analysis-history"><div className="analysis-history-heading"><b>Analysis history</b><span>{analysisHistory.length} saved</span></div>{analysisHistory.length ? analysisHistory.map((item) => <article key={item.id}><button type="button" className="analysis-history-open" onClick={() => setAnalysisResult(item)}><span><b>{item.question}</b><small>{new Date(item.createdAt).toLocaleString()}</small></span><strong>{item.metric}</strong></button><button type="button" className="analysis-export-button" onClick={() => exportAnalysis(item)} aria-label="Export this analysis"><Icon name="download" size={15} /></button></article>) : <p className="analysis-history-empty">Your saved analyses will appear here.</p>}</div></section>
    <div className="reports-row reports-row-top"><section className="report-panel activity-report"><header className="report-panel-header"><div><h3>Lead activity</h3><p>New leads and conversions over time</p></div><label><select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Group lead activity"><option>Daily</option><option>Weekly</option></select><Icon name="chevron" size={12} /></label></header><ActivityChart leads={rangeLeads} period={period} group={group} /></section>
      <section className="report-panel conversion-report"><header className="report-panel-header"><div><h3>Pipeline conversion</h3><p>Lead progression by stage</p></div><label><select value={pipelinePeriod} onChange={(event) => setPipelinePeriod(event.target.value)} aria-label="Pipeline reporting period"><option>This month</option><option>This quarter</option><option>This year</option></select><Icon name="chevron" size={12} /></label></header><div className="conversion-bars">{periodStageRows.map((item) => { const percent = stageTotal ? Math.round(item.count / stageTotal * 100) : 0; return <div className="conversion-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${percent}%`, background: item.color }} /></div><b>{item.count}</b><small>{percent}%</small></div>; })}</div><footer>{stageTotal} leads entered {pipelinePeriod.toLowerCase()}</footer></section></div>

    <div className="reports-row reports-row-bottom"><section className="report-panel sources-report"><header className="report-panel-header"><div><h3>Lead sources</h3><p>Where your leads come from</p></div></header><div className="sources-layout"><div className="source-donut" style={{ background: sourceTotal ? `conic-gradient(${sourceRows.map((item, index) => { const before = sourceRows.slice(0, index).reduce((sum, row) => sum + row.count, 0) / sourceTotal * 100; const after = (sourceRows.slice(0, index + 1).reduce((sum, row) => sum + row.count, 0) / sourceTotal * 100); return `${item.color} ${before}% ${after}%`; }).join(",")})` : "conic-gradient(#26345b 0% 100%)" }}><div><strong>{sourceTotal}</strong><small>LEADS</small></div></div><div className="source-legend">{sourceRows.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{item.count}</b><small>{sourceTotal ? Math.round(item.count / sourceTotal * 100) : 0}%</small></div>)}</div>{!sourceTotal && <p className="report-empty-note">Lead sources will appear here as you add leads.</p>}</div></section>
      <section className="report-panel team-report"><header className="report-panel-header"><div><h3>Team performance</h3><p>Leads won and follow-up activity</p></div></header><div className="team-report-scroll"><table className="team-report-table"><thead><tr><th>OWNER</th><th>LEADS WON</th><th>CONVERSION</th><th>FOLLOW-UPS</th><th>TREND</th></tr></thead><tbody>{teamRows.map((person) => <tr key={person.name}><td><span className={`owner-avatar ${person.color}`}>{person.initials}</span><b>{person.name}</b></td><td>{person.won}</td><td>{person.conversion}%</td><td>{person.followups}</td><td><Sparkline values={person.trend} color={person.color} /></td></tr>)}</tbody></table></div><footer>Updated moments ago · Compare across any date range</footer></section></div>
    {analysisResult && <div className="pipeline-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAnalysisResult(null)}><section className="pipeline-modal analysis-result-modal" role="dialog" aria-modal="true" aria-labelledby="analysis-result-title"><header><div><h2 id="analysis-result-title">Lead analysis</h2><p>{analysisResult.question}</p></div><button type="button" aria-label="Close" onClick={() => setAnalysisResult(null)}><Icon name="close" size={18} /></button></header><div className="analysis-result-metric"><span>RESULT</span><strong>{analysisResult.metric}</strong></div><p className="analysis-result-summary">{analysisResult.summary}</p><div className="analysis-result-details">{analysisResult.details}</div><footer><button type="button" onClick={() => setAnalysisResult(null)}>Close</button><button className="reports-export" type="button" onClick={() => exportAnalysis(analysisResult)}><Icon name="download" size={14} />Export analysis</button></footer></section></div>}
  </div>;
}
