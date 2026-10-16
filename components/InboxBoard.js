"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icons";

const MESSAGE_SEED = [
  { id: "biba", name: "Biba Kulture", detail: "Biba Kalu · Qualified lead", initials: "BK", preview: "Could you send the updated pricing?", time: "10:42 AM", unread: true, lead: "$5,000 opportunity", messages: [{ side: "them", text: "Hi John, could you send the updated pricing with the delivery options included?", time: "10:12 AM" }, { side: "me", text: "Hi Biba, absolutely. I’ll send the revised proposal over before noon.", time: "10:18 AM" }, { side: "them", text: "Perfect, thank you! Please include the two delivery options we discussed.", time: "10:42 AM" }] },
  { id: "glitz", name: "Glitz N Glam", detail: "Tolu James", initials: "GN", preview: "Thanks! I’ll review the proposal today.", time: "9:18 AM", unread: true, lead: "$3,600 opportunity", messages: [{ side: "them", text: "Thanks! I’ll review the proposal today.", time: "9:18 AM" }] },
  { id: "mira", name: "Mira Beauty Studio", detail: "Mira Okafor", initials: "MO", preview: "Can we schedule a quick call this week?", time: "Yesterday", unread: false, lead: "$2,400 opportunity", messages: [{ side: "them", text: "Can we schedule a quick call this week?", time: "Yesterday" }] },
  { id: "shop", name: "Shopkyluxury", detail: "Kemi Ayo", initials: "SK", preview: "The inventory list is attached.", time: "Yesterday", unread: false, lead: "$4,250 opportunity", messages: [{ side: "them", text: "The inventory list is attached.", time: "Yesterday" }] },
  { id: "naya", name: "Naya Home", detail: "Naya Bello", initials: "NH", preview: "Just checking in on my last message.", time: "Oct 14", unread: false, lead: "$3,200 opportunity", messages: [{ side: "them", text: "Just checking in on my last message.", time: "Oct 14" }] },
  { id: "lush", name: "Lush Skin Co.", detail: "Amaka Obi", initials: "LS", preview: "Appreciate the details, thank you.", time: "Oct 13", unread: false, lead: "$2,100 opportunity", messages: [{ side: "them", text: "Appreciate the details, thank you.", time: "Oct 13" }] },
];

const NOTIFICATION_SEED = [
  { id: 1, icon: "leads", color: "blue", title: "New lead added", detail: "Mira Beauty Studio · Instagram", time: "10:34 AM", unread: true, href: "/leads" },
  { id: 2, icon: "tasks", color: "violet", title: "Task due soon", detail: "Discovery call with Biba Kulture", time: "9:45 AM", unread: true, href: "/tasks" },
  { id: 3, icon: "mail", color: "blue", title: "New message", detail: "Biba Kulture sent you a message", time: "10:42 AM", unread: true, href: "/inbox?view=messages" },
  { id: 4, icon: "pipeline", color: "yellow", title: "Stage updated", detail: "Glitz N Glam moved to Proposal", time: "Yesterday", unread: false, href: "/pipeline" },
  { id: 5, icon: "clock", color: "yellow", title: "Follow-up overdue", detail: "Naya Home · 2 days overdue", time: "Yesterday", unread: false, href: "/calendar" },
  { id: 6, icon: "check", color: "green", title: "Task completed", detail: "Revised estimate sent to Lush Skin Co.", time: "Oct 14", unread: false, href: "/tasks" },
];
const KEY = "flowbase:inbox:v1";

export default function InboxBoard() {
  const [view, setView] = useState("messages");
  const [messages, setMessages] = useState(MESSAGE_SEED);
  const [notifications, setNotifications] = useState(NOTIFICATION_SEED);
  const [selectedId, setSelectedId] = useState("biba");
  const [messageSearch, setMessageSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [notificationFilter, setNotificationFilter] = useState("All");
  const [reply, setReply] = useState("");
  const [modal, setModal] = useState(false);
  const [compose, setCompose] = useState({ to: "", text: "" });
  const [history, setHistory] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setView(new URLSearchParams(window.location.search).get("view") === "notifications" ? "notifications" : "messages");
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved?.messages) setMessages(saved.messages);
      if (saved?.notifications) setNotifications(saved.notifications);
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY, JSON.stringify({ messages, notifications })); } catch {} }, [messages, notifications, hydrated]);

  const selected = messages.find((item) => item.id === selectedId) || messages[0];
  const unreadMessages = messages.filter((item) => item.unread).length;
  const unreadNotifications = notifications.filter((item) => item.unread).length;
  const visibleMessages = useMemo(() => messages.filter((item) => {
    const match = `${item.name} ${item.detail} ${item.preview}`.toLowerCase().includes(messageSearch.toLowerCase());
    return match && (filter === "All" || (filter === "Unread" ? item.unread : item.archived));
  }), [messages, messageSearch, filter]);
  const visibleNotifications = notifications.filter((item) => notificationFilter === "All" || item.unread);

  const selectMessage = (item) => {
    setSelectedId(item.id);
    setMessages((current) => current.map((message) => message.id === item.id ? { ...message, unread: false } : message));
  };
  const sendReply = (event) => {
    event.preventDefault();
    if (!reply.trim() || !selected) return;
    const nextMessage = { side: "me", text: reply.trim(), time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) };
    setMessages((current) => current.map((item) => item.id === selected.id ? { ...item, preview: nextMessage.text, time: nextMessage.time, messages: [...item.messages, nextMessage] } : item));
    setReply("");
  };
  const sendCompose = (event) => {
    event.preventDefault();
    if (!compose.to.trim() || !compose.text.trim()) return;
    const matched = messages.find((item) => item.name.toLowerCase() === compose.to.trim().toLowerCase());
    if (matched) {
      setSelectedId(matched.id);
      const nextMessage = { side: "me", text: compose.text.trim(), time: "Now" };
      setMessages((current) => current.map((item) => item.id === matched.id ? { ...item, preview: nextMessage.text, time: "Now", messages: [...item.messages, nextMessage] } : item));
    } else {
      const newMessage = { id: `local-${Date.now()}`, name: compose.to.trim(), detail: "New conversation", initials: compose.to.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), preview: compose.text.trim(), time: "Now", unread: false, lead: "Linked lead", messages: [{ side: "me", text: compose.text.trim(), time: "Now" }] };
      setMessages((current) => [newMessage, ...current]);
      setSelectedId(newMessage.id);
    }
    setView("messages"); setFilter("All"); setModal(false); setCompose({ to: "", text: "" });
  };
  const archiveSelected = () => {
    if (!selected) return;
    setMessages((current) => current.map((item) => item.id === selected.id ? { ...item, archived: !item.archived } : item));
  };
  const markAllRead = () => setNotifications((current) => current.map((item) => ({ ...item, unread: false })));

  return <div className="inbox-page">
    <section className="inbox-heading panel"><div><h1>Inbox</h1><p>Messages and updates that keep your leads moving.</p></div><button type="button" className="inbox-compose-button" onClick={() => setModal(true)}><Icon name="plus" size={15} />Compose</button></section>
    <section className="inbox-overview"><div><span className="inbox-eyebrow">COMMUNICATIONS</span><h2>Stay on top of every conversation</h2><p>Read lead messages and catch important updates in one place.</p></div><div className="inbox-stats"><button type="button" onClick={() => { setView("messages"); setFilter("Unread"); }}><i className="violet"/><span>UNREAD MESSAGES</span><b>{unreadMessages}</b><small>2 need a reply</small></button><button type="button" onClick={() => { setView("notifications"); setNotificationFilter("Unread"); }}><i className="blue"/><span>NEW NOTIFICATIONS</span><b>{unreadNotifications}</b><small>Since your last visit</small></button><Link href="/calendar"><i className="yellow"/><span>FOLLOW-UPS TODAY</span><b>4</b><small>Across 3 leads</small></Link></div></section>
    <section className="inbox-workspace panel">
      <div className="inbox-tabs"><button type="button" className={view === "messages" ? "active" : ""} onClick={() => setView("messages")}><Icon name="mail" size={15}/>Messages<span>{unreadMessages}</span></button><button type="button" className={view === "notifications" ? "active" : ""} onClick={() => setView("notifications")}><Icon name="bell" size={15}/>Notifications<span>{unreadNotifications}</span></button></div>
      <div className={`inbox-columns ${view === "notifications" ? "notifications-focus" : ""}`}>
        <section className="inbox-thread-list" aria-label="Message conversations"><label className="inbox-search"><Icon name="search" size={15}/><input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search messages" aria-label="Search messages"/>{messageSearch && <button type="button" onClick={() => setMessageSearch("")} aria-label="Clear search"><Icon name="close" size={14}/></button>}</label><div className="inbox-filter-tabs">{["All", "Unread", "Archived"].map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="inbox-thread-items">{visibleMessages.map((item) => <button type="button" className={`inbox-thread ${selected?.id === item.id && view === "messages" ? "selected" : ""}`} key={item.id} onClick={() => { selectMessage(item); setView("messages"); }}><i className="inbox-avatar">{item.initials}</i><span className="inbox-thread-copy"><b>{item.name}</b><small>{item.detail}</small><span>{item.preview}</span></span><time>{item.time}</time>{item.unread && <i className="inbox-unread-dot"/>}</button>)}{visibleMessages.length === 0 && <p className="inbox-empty">No conversations found.</p>}</div></section>
        <section className="inbox-conversation" aria-label="Selected conversation">{selected ? <><header className="inbox-conversation-head"><i className="inbox-avatar">{selected.initials}</i><span><b>{selected.name}</b><small>{selected.detail}</small></span><button type="button" aria-label={selected.archived ? "Unarchive conversation" : "Archive conversation"} title={selected.archived ? "Unarchive" : "Archive"} onClick={archiveSelected}><Icon name="more" size={20}/></button></header><Link className="inbox-linked-lead" href="/leads"><small>LINKED LEAD</small><b>{selected.name} · {selected.lead}</b><span>Open lead <Icon name="arrow" size={13}/></span></Link><div className="inbox-day-divider"><i/>TODAY<i/></div><div className="inbox-bubbles">{selected.messages.map((item, index) => <div className={`inbox-bubble ${item.side === "me" ? "mine" : ""}`} key={`${item.time}-${index}`}><p>{item.text}</p><time>{item.time}</time></div>)}</div><div className="inbox-reminder"><i/><span><b>Follow-up reminder</b><small>Send updated proposal · Today, 11:00 AM</small></span><Link href="/tasks">Task</Link></div><form className="inbox-reply" onSubmit={sendReply}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply…" aria-label="Write a reply"/><div><button type="button" className="inbox-attach" onClick={() => document.getElementById("inbox-attachment")?.click()}><Icon name="plus" size={14}/>Attach</button><input id="inbox-attachment" type="file" hidden onChange={(event) => event.target.files?.[0] && setReply((value) => `${value}${value ? " " : ""}[Attached: ${event.target.files[0].name}]`)}/><button type="submit" className="inbox-send" disabled={!reply.trim()}>Send <Icon name="arrow" size={14}/></button></div></form></> : <p className="inbox-empty">Select a conversation to view it.</p>}</section>
        <section className="inbox-notification-panel"><header><div><h3>Notifications</h3>{history && <small>Recent notification history</small>}</div><button type="button" onClick={markAllRead}>Mark all read</button></header><div className="inbox-filter-tabs"><button type="button" className={notificationFilter === "All" ? "active" : ""} onClick={() => setNotificationFilter("All")}>All</button><button type="button" className={notificationFilter === "Unread" ? "active" : ""} onClick={() => setNotificationFilter("Unread")}>Unread</button></div><small className="inbox-today-label">TODAY</small><div className="inbox-notifications">{visibleNotifications.map((item) => <Link href={item.href} className={`inbox-notification ${item.unread ? "unread" : ""}`} key={item.id} onClick={() => setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, unread: false } : notification))}><i className={`notification-icon ${item.color}`}><Icon name={item.icon} size={15}/></i><span><b>{item.title}</b><small>{item.detail}</small><time>{item.time}</time></span>{item.unread && <i className="notification-dot"/>}</Link>)}{visibleNotifications.length === 0 && <p className="inbox-empty">You’re all caught up.</p>}</div><button type="button" className="inbox-history-button" onClick={() => { setHistory((current) => !current); setNotificationFilter("All"); }}>{history ? "Hide notification history" : "View notification history"}<Icon name="arrow" size={14}/></button></section>
      </div>
    </section>
    {modal && <div className="inbox-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(false)}><section className="inbox-modal panel" role="dialog" aria-modal="true" aria-labelledby="compose-title"><header><div><h2 id="compose-title">Compose message</h2><p>Start a conversation with a lead.</p></div><button type="button" aria-label="Close" onClick={() => setModal(false)}><Icon name="close" size={18}/></button></header><form onSubmit={sendCompose}><label>To<input required list="inbox-recipients" value={compose.to} onChange={(event) => setCompose({ ...compose, to: event.target.value })} placeholder="Lead or contact name"/><datalist id="inbox-recipients">{messages.map((item) => <option key={item.id} value={item.name}/>)}</datalist></label><label>Message<textarea required value={compose.text} onChange={(event) => setCompose({ ...compose, text: event.target.value })} placeholder="Write your message…"/></label><footer><button type="button" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="inbox-send">Send message <Icon name="arrow" size={14}/></button></footer></form></section></div>}
  </div>;
}
