"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";
import { LEADS_EVENT, readLeads } from "@/lib/leads";
import { localDateKey, readTasks, TASKS_EVENT } from "@/lib/tasks";

const PAYMENT_KEY = "flowbase:payments:v1";
const ACTIVITY_KEY = "flowbase:client-activity:v1";
const isClient = (record) => record.recordType === "client" || record.stage === "Won";

function readArray(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function DashboardOverview() {
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const refresh = () => {
      setLeads(readLeads());
      setTasks(readTasks());
      setPayments(readArray(PAYMENT_KEY));
      setActivity(readArray(ACTIVITY_KEY));
    };
    refresh();
    const events = [LEADS_EVENT, TASKS_EVENT, "flowbase:payments-updated", "flowbase:client-activity-updated", "storage"];
    events.forEach((event) => window.addEventListener(event, refresh));
    return () => events.forEach((event) => window.removeEventListener(event, refresh));
  }, []);

  const clients = useMemo(() => leads.filter(isClient), [leads]);
  const prospects = useMemo(() => leads.filter((record) => !isClient(record)), [leads]);
  const clientTasks = useMemo(() => tasks.filter((task) => !task.completed && clients.some((client) => Number(task.clientId) === Number(client.id) || task.lead === client.name)), [tasks, clients]);
  const dueFollowUps = prospects.filter((lead) => lead.followUpDate && lead.followUpDate <= localDateKey()).length;
  const paidTotal = payments.filter((payment) => payment.status === "Paid").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const recentActivity = activity
    .filter((item) => clients.some((client) => Number(client.id) === Number(item.clientId)))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 4);

  return <>
    <section className="stats dashboard-summary-stats" aria-label="Business summary">
      <Link href="/workspace?tab=leads" className="panel stat stat-total" aria-label={`${prospects.length} total leads. Open leads.`}>
        <h2 className="stat-label">TOTAL LEADS</h2><div className="stat-value">{prospects.length}</div><div className="stat-note">Active opportunities</div><span className="stat-icon"><Icon name="leads" size={21}/></span>
      </Link>
      <Link href="/workspace?tab=clients" className="panel stat stat-workspace-clients" aria-label={`${clients.length} active clients. Open clients.`}>
        <h2 className="stat-label">ACTIVE CLIENTS</h2><div className="stat-value">{clients.length}</div><div className="stat-note">Accounts you’re serving</div><span className="stat-icon"><Icon name="briefcase" size={20}/></span>
      </Link>
      <Link href="/workspace?tab=leads" className="panel stat stat-due" aria-label={`${dueFollowUps} follow-ups due. Open leads.`}>
        <h2 className="stat-label plain">FOLLOW-UPS DUE</h2><div className="stat-row"><strong>{dueFollowUps}</strong><span>Today or overdue</span></div>
      </Link>
      <Link href="/tasks" className="panel stat stat-workspace-tasks" aria-label={`${clientTasks.length} open client tasks. Open tasks.`}>
        <h2 className="stat-label plain">OPEN CLIENT TASKS</h2><div className="stat-row"><strong>{clientTasks.length}</strong><span>Across your clients</span></div>
      </Link>
    </section>

    <section className="panel dashboard-workspace-snapshot">
      <header className="card-head">
        <div><h2>Workspace snapshot</h2><small>Current client work and recent updates</small></div>
        <Link href="/workspace" className="head-link">Open workspace <Icon name="arrow" size={15}/></Link>
      </header>
      <div className="dashboard-workspace-content">
        <div className="dashboard-workspace-metrics">
          <Link href="/workspace?tab=clients"><span>ACTIVE CLIENTS</span><b>{clients.length}</b></Link>
          <Link href="/tasks"><span>OPEN CLIENT TASKS</span><b>{clientTasks.length}</b></Link>
          <Link href="/workspace?tab=payments"><span>PAYMENTS RECEIVED</span><b>{formatMoney(paidTotal)}</b></Link>
        </div>
        <div className="dashboard-workspace-activity">
          <h3>Recent client activity</h3>
          {recentActivity.length ? recentActivity.map((item) => {
            const client = clients.find((record) => Number(record.id) === Number(item.clientId));
            return <Link href="/workspace?tab=clients" className="dashboard-client-activity" key={item.id}>
              <span className="act-icon teal"><Icon name={item.type === "payment" ? "report" : "briefcase"} size={14}/></span>
              <span><b>{item.title}</b><small>{client?.name || "Client"} · {item.note}</small></span>
              <time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</time>
            </Link>;
          }) : <div className="dashboard-workspace-empty"><Icon name="briefcase" size={17}/><span>Client updates will appear here as you log work or payments.</span><Link href="/workspace?tab=clients">Open clients</Link></div>}
        </div>
      </div>
    </section>
  </>;
}
