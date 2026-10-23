"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";
import PipelineBoard from "@/components/PipelineBoard";
import LeadsTable from "@/components/LeadsTable";
import { createLead, LEADS_EVENT, readLeads, writeLeads } from "@/lib/leads";
import { readTasks, TASKS_EVENT } from "@/lib/tasks";

const PAYMENT_KEY = "flowbase:payments:v1";
const ACTIVITY_KEY = "flowbase:client-activity:v1";
const tabs = ["Overview", "Pipeline", "Leads", "Clients", "Payments"];
const isClient = (item) => item.recordType === "client" || item.stage === "Won";
const money = (value) => `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function readStored(key) { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }

export default function WorkspaceBoard() {
  const [tab, setTab] = useState("Overview");
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [showClientForm, setShowClientForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", email: "", service: "", notes: "" });
  const [selectedClient, setSelectedClient] = useState(null);
  const [workNote, setWorkNote] = useState("");
  const [paymentDraft, setPaymentDraft] = useState({ clientId: "", service: "", amount: "", status: "Paid", date: new Date().toISOString().slice(0, 10), source: "Manual" });
  const [notice, setNotice] = useState("");

  const refresh = () => {
    setLeads(readLeads());
    setTasks(readTasks());
    setPayments(readStored(PAYMENT_KEY));
    setActivity(readStored(ACTIVITY_KEY));
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selected = tabs.find((item) => item.toLowerCase() === params.get("tab"));
    if (selected) setTab(selected);
    refresh();
    window.addEventListener(LEADS_EVENT, refresh);
    window.addEventListener(TASKS_EVENT, refresh);
    window.addEventListener("flowbase:payments-updated", refresh);
    window.addEventListener("flowbase:client-activity-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LEADS_EVENT, refresh);
      window.removeEventListener(TASKS_EVENT, refresh);
      window.removeEventListener("flowbase:payments-updated", refresh);
      window.removeEventListener("flowbase:client-activity-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const clients = useMemo(() => leads.filter(isClient), [leads]);
  const prospects = useMemo(() => leads.filter((item) => !isClient(item)), [leads]);
  const setView = (value) => {
    setTab(value);
    const query = value === "Overview" ? "" : `?tab=${value.toLowerCase()}`;
    window.history.replaceState({}, "", `/workspace${query}`);
    window.dispatchEvent(new CustomEvent("flowbase:workspace-section-changed", { detail: value === "Overview" ? "" : value.toLowerCase() }));
    setSelectedClient(null);
  };
  const addClient = (event) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const record = createLead({ businessName: draft.name, contactName: draft.contact || draft.name, email: draft.email, source: "Existing client", stage: "Won", owner: "You", about: draft.notes, service: draft.service, recordType: "client" });
    const next = [record, ...readLeads()];
    writeLeads(next);
    const entry = { id: Date.now(), clientId: record.id, type: "system", title: "Client added", note: `${record.name} was added as an existing client.`, createdAt: new Date().toISOString() };
    const nextActivity = [entry, ...readStored(ACTIVITY_KEY)];
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(nextActivity));
    setDraft({ name: "", contact: "", email: "", service: "", notes: "" });
    setShowClientForm(false);
    setSelectedClient(record);
    refresh();
  };
  const addWorkNote = (event) => {
    event.preventDefault();
    if (!selectedClient || !workNote.trim()) return;
    const entry = { id: Date.now(), clientId: selectedClient.id, type: "work", title: "Work update", note: workNote.trim(), createdAt: new Date().toISOString() };
    const next = [entry, ...readStored(ACTIVITY_KEY)];
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("flowbase:client-activity-updated"));
    setWorkNote("");
  };
  const addPayment = (event) => {
    event.preventDefault();
    if (!paymentDraft.clientId || !Number(paymentDraft.amount)) return;
    const record = { ...paymentDraft, id: Date.now(), amount: Number(paymentDraft.amount), clientId: Number(paymentDraft.clientId), createdAt: new Date().toISOString() };
    const next = [record, ...readStored(PAYMENT_KEY)];
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("flowbase:payments-updated"));
    const account = leads.find((item) => Number(item.id) === record.clientId);
    if (account && isClient(account)) {
      const activityEntry = { id: Date.now() + 1, clientId: record.clientId, type: "payment", title: `${record.status} payment recorded`, note: `${record.service || "Payment"} · ${money(record.amount)}`, createdAt: new Date().toISOString() };
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify([activityEntry, ...readStored(ACTIVITY_KEY)]));
      window.dispatchEvent(new Event("flowbase:client-activity-updated"));
    }
    setPaymentDraft((current) => ({ ...current, service: "", amount: "" }));
    setNotice("Payment record saved.");
    window.setTimeout(() => setNotice(""), 3000);
  };
  const selectedActivity = selectedClient ? activity.filter((item) => Number(item.clientId) === Number(selectedClient.id)) : [];
  const selectedPayments = selectedClient ? payments.filter((item) => Number(item.clientId) === Number(selectedClient.id)) : [];
  const received = payments.filter((item) => item.status === "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const clientTasks = tasks.filter((task) => clients.some((client) => Number(task.clientId) === Number(client.id) || task.lead === client.name));

  return <main className="workspace-page">
    <section className="workspace-heading panel"><div><span className="workspace-eyebrow">YOUR BUSINESS HUB</span><h1>Workspace</h1><p>Move opportunities forward and keep client work together.</p></div><div className="workspace-heading-actions"><Link href="/tasks" className="workspace-action secondary"><Icon name="tasks" size={15}/>All tasks</Link><Link href="/calendar" className="workspace-action secondary"><Icon name="calendar" size={15}/>Calendar</Link><button className="workspace-action" type="button" onClick={() => { setTab("Clients"); setShowClientForm(true); }}><Icon name="plus" size={15}/>Add client</button></div></section>
    <nav className="workspace-tabs" aria-label="Workspace sections">{tabs.map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setView(item)}>{item}{item === "Leads" && <small>{prospects.length}</small>}{item === "Clients" && <small>{clients.length}</small>}</button>)}</nav>

    {tab === "Overview" && <section className="workspace-overview">
      <div className="workspace-metrics"><article><span>ACTIVE CLIENTS</span><b>{clients.length}</b><small>Accounts you’re currently serving</small></article><article><span>OPEN LEADS</span><b>{prospects.length}</b><small>Prospects in your pipeline</small></article><article><span>CLIENT TASKS</span><b>{clientTasks.filter((task) => !task.completed).length}</b><small>Open tasks linked to clients</small></article><article><span>PAYMENTS RECORDED</span><b>{money(received)}</b><small>Marked as received</small></article></div>
      <div className="workspace-overview-grid"><section className="workspace-panel"><header><div><h2>Current clients</h2><p>Open a record to see its work history.</p></div><button type="button" onClick={() => setView("Clients")}>View all <Icon name="arrow" size={14}/></button></header>{clients.slice(0, 5).map((client) => <button type="button" className="workspace-client-row" key={client.id} onClick={() => { setTab("Clients"); setSelectedClient(client); }}><span className="workspace-client-avatar">{client.initials}</span><span><b>{client.name}</b><small>{client.service || client.contact || "Client account"}</small></span><Icon name="chevron" size={14}/></button>)}{clients.length === 0 && <div className="workspace-empty"><Icon name="briefcase" size={23}/><b>No clients added yet</b><span>Add an existing client or convert a won lead into a client record.</span><button type="button" onClick={() => { setTab("Clients"); setShowClientForm(true); }}>Add existing client</button></div>}</section><section className="workspace-panel"><header><div><h2>Recent client activity</h2><p>Notes and work updates across your clients.</p></div></header>{activity.filter((item) => clients.some((client) => Number(client.id) === Number(item.clientId))).slice(0, 6).map((item) => { const client = clients.find((record) => Number(record.id) === Number(item.clientId)); return <article className="workspace-activity-row" key={item.id}><i/><div><b>{item.title}</b><small>{client?.name || "Client"} · {item.note}</small></div><time>{new Date(item.createdAt).toLocaleDateString()}</time></article>; })}{activity.filter((item) => clients.some((client) => Number(client.id) === Number(item.clientId))).length === 0 && <div className="workspace-empty compact"><Icon name="note" size={22}/><b>No activity recorded</b><span>Client work updates will appear here.</span></div>}</section></div>
    </section>}

    {tab === "Pipeline" && <PipelineBoard />}
    {tab === "Leads" && <LeadsTable />}

    {tab === "Clients" && <section className="workspace-panel workspace-clients-panel">
      {selectedClient ? <><header><div><button type="button" className="workspace-back" onClick={() => setSelectedClient(null)}>← Clients</button><h2>{selectedClient.name}</h2><p>{selectedClient.contact || "Client"}{selectedClient.email ? ` · ${selectedClient.email}` : ""}</p></div><button type="button" onClick={() => setSelectedClient(null)}>Close</button></header><div className="client-record-grid"><article className="client-record-card"><span>STATUS</span><b>Current client</b><small>Added {selectedClient.date || "recently"}</small></article><article className="client-record-card"><span>SERVICE</span><b>{selectedClient.service || "Add service details"}</b><small>{selectedClient.about || "Keep service notes and context here."}</small></article><article className="client-record-card"><span>PAYMENTS RECORDED</span><b>{money(selectedPayments.filter((item) => item.status === "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0))}</b><small>{selectedPayments.length} payment entries</small></article></div><form className="client-work-form" onSubmit={addWorkNote}><label htmlFor="client-work-note">Log work, change, or client update</label><textarea id="client-work-note" value={workNote} onChange={(event) => setWorkNote(event.target.value)} placeholder="For example: website downtime investigated; plugin updated; email campaign prepared."/><button type="submit" className="workspace-action"><Icon name="plus" size={14}/>Add to activity</button></form><div className="client-record-lower"><section><h3>Activity history</h3>{selectedActivity.map((item) => <article className="workspace-activity-row" key={item.id}><i/><div><b>{item.title}</b><small>{item.note}</small></div><time>{new Date(item.createdAt).toLocaleString()}</time></article>)}{selectedActivity.length === 0 && <p className="workspace-muted">No work has been logged for this client.</p>}</section><section><h3>Upcoming work</h3>{clientTasks.filter((task) => task.clientId === selectedClient.id || task.lead === selectedClient.name).map((task) => <article className="client-mini-task" key={task.id}><Icon name="tasks" size={15}/><span><b>{task.title}</b><small>{task.due || task.date || "No due date"}</small></span></article>)}{clientTasks.filter((task) => task.clientId === selectedClient.id || task.lead === selectedClient.name).length === 0 && <p className="workspace-muted">Client tasks will appear here when assigned.</p>}<Link href="/tasks" className="workspace-inline-link">Open all tasks <Icon name="arrow" size={13}/></Link></section></div></> : <><header><div><h2>Clients</h2><p>Current and former client accounts, with their work kept together.</p></div><button type="button" className="workspace-action" onClick={() => setShowClientForm((value) => !value)}><Icon name="plus" size={14}/>Add existing client</button></header>{showClientForm && <form className="workspace-client-form" onSubmit={addClient}><label>Business or client name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Client name"/></label><label>Contact name<input value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} placeholder="Primary contact"/></label><label>Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="name@company.com"/></label><label>Current service<input value={draft.service} onChange={(event) => setDraft({ ...draft, service: event.target.value })} placeholder="Website care, email marketing…"/></label><label className="wide">Notes<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Existing context, work in progress, or client preferences"/></label><div className="workspace-form-actions"><button type="button" onClick={() => setShowClientForm(false)}>Cancel</button><button type="submit" className="workspace-action">Save client</button></div></form>}<div className="workspace-client-grid">{clients.map((client) => <button type="button" className="workspace-client-card" key={client.id} onClick={() => setSelectedClient(client)}><span className="workspace-client-avatar">{client.initials}</span><span><b>{client.name}</b><small>{client.contact || "Client"}{client.email ? ` · ${client.email}` : ""}</small><small>{client.service || "No active service recorded"}</small></span><i>Active</i><Icon name="arrow" size={15}/></button>)}</div>{clients.length === 0 && !showClientForm && <div className="workspace-empty"><Icon name="briefcase" size={24}/><b>No clients yet</b><span>Add a current client directly, or move a lead to Won in the Pipeline.</span><button type="button" onClick={() => setShowClientForm(true)}>Add existing client</button></div>}</>}
    </section>}

    {tab === "Payments" && <section className="workspace-panel workspace-payments-panel"><header><div><h2>Payments</h2><p>Keep payment records for leads and clients, whether received manually or captured from a connected source.</p></div></header><div className="payment-capture-options"><article className="payment-option active"><span className="payment-option-icon"><Icon name="note" size={18}/></span><div><b>Manual entry</b><small>Record payments made outside Flowbase.</small></div><strong>Ready</strong></article><article className="payment-option"><span className="payment-option-icon"><Icon name="mail" size={18}/></span><div><b>Automatic capture</b><small>Import payment confirmations from a connected payment provider or billing email.</small></div><button type="button" onClick={() => setNotice("Automatic capture needs an email or payment-provider connection and backend credentials. The record structure is ready for that connection.")}>Connection setup</button></article></div><form className="workspace-client-form payment-form" onSubmit={addPayment}><label>Lead or client<select required value={paymentDraft.clientId} onChange={(event) => setPaymentDraft({ ...paymentDraft, clientId: event.target.value })}><option value="">Choose a record</option>{leads.map((record) => <option key={record.id} value={record.id}>{record.name} · {isClient(record) ? "Client" : "Lead"}</option>)}</select></label><label>Service or reason<input value={paymentDraft.service} onChange={(event) => setPaymentDraft({ ...paymentDraft, service: event.target.value })} placeholder="Website maintenance"/></label><label>Amount<input type="number" min="0.01" step="0.01" required value={paymentDraft.amount} onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: event.target.value })} placeholder="0.00"/></label><label>Status<select value={paymentDraft.status} onChange={(event) => setPaymentDraft({ ...paymentDraft, status: event.target.value })}><option>Paid</option><option>Expected</option><option>Overdue</option></select></label><label>Date<input type="date" value={paymentDraft.date} onChange={(event) => setPaymentDraft({ ...paymentDraft, date: event.target.value })}/></label><div className="workspace-form-actions"><button type="submit" className="workspace-action"><Icon name="plus" size={14}/>Record payment</button></div></form><div className="payments-table"><div className="payments-row payments-head"><span>LEAD / CLIENT</span><span>SERVICE</span><span>DATE</span><span>AMOUNT</span><span>STATUS / SOURCE</span></div>{payments.map((payment) => { const account = leads.find((record) => Number(record.id) === Number(payment.clientId)); return <article className="payments-row" key={payment.id}><b>{account?.name || "Removed account"}</b><span>{payment.service || "—"}</span><span>{payment.date}</span><strong>{money(payment.amount)}</strong><span><i className={`payment-status ${payment.status.toLowerCase()}`}>{payment.status}</i><small>{payment.source || "Manual"}</small></span></article>; })}{payments.length === 0 && <div className="workspace-empty compact"><Icon name="note" size={22}/><b>No payment records</b><span>Manual entries and connected-source captures will appear here.</span></div>}</div>{notice && <p className="workspace-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></p>}</section>}
  </main>;
}
