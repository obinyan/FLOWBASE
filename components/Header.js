"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./Icons";
import { AVATAR_SRC } from "@/lib/config";
import { ADD_LEAD_EVENT } from "@/lib/leads";
import { readInbox as readInboxData } from "@/lib/inbox";

const greetingForHour = (hour) => hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
const greetingName = (stored) => stored?.replace(/^good\s+(morning|afternoon|evening)\s*/i, "").trim() || "John";

export default function Header() {
  const [savedGreeting, setSavedGreeting] = useState("Good morning John");
  const [period, setPeriod] = useState("Good morning");
  const [unreadMessages, setUnreadMessages] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(false);

  useEffect(() => {
    const update = () => setPeriod(greetingForHour(new Date().getHours()));
    const readInbox = () => {
      try {
        const inbox = readInboxData();
        setUnreadMessages(inbox.messages.some((item) => item.unread));
        setUnreadNotifications(inbox.notifications.some((item) => item.unread));
      } catch { setUnreadMessages(false); setUnreadNotifications(false); }
    };
    try { setSavedGreeting(localStorage.getItem("flowbase:greeting") || "Good morning John"); } catch {}
    update(); readInbox();
    const clock = window.setInterval(update, 60000);
    window.addEventListener("storage", readInbox);
    window.addEventListener("flowbase:inbox-updated", readInbox);
    return () => { window.clearInterval(clock); window.removeEventListener("storage", readInbox); window.removeEventListener("flowbase:inbox-updated", readInbox); };
  }, []);

  const save = (event) => {
    const name = greetingName(event.currentTarget.textContent.trim());
    const value = `${period} ${name}`;
    setSavedGreeting(value);
    event.currentTarget.textContent = value;
    try { localStorage.setItem("flowbase:greeting", value); } catch {}
  };

  return <header className="panel topbar">
    <h1 className="greeting" contentEditable suppressContentEditableWarning spellCheck={false} role="textbox" aria-label="Greeting (editable)" onBlur={save} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}>{`${period} ${greetingName(savedGreeting)}`}</h1>
    <div className="top-actions">
      <Link href="/inbox?view=messages" className="icon-btn" aria-label="Messages"><Icon name="mail" size={26} />{unreadMessages && <i className="dot" />}</Link>
      <Link href="/inbox?view=notifications" className="icon-btn" aria-label="Notifications and reminders"><Icon name="bell" size={26} />{unreadNotifications && <i className="dot" />}</Link>
      <button type="button" className="btn-add" onClick={() => window.dispatchEvent(new Event(ADD_LEAD_EVENT))}><Icon name="plus" size={18} strokeWidth={2} /><span>Add lead</span></button>
      <Link href="/profile" className="avatar" aria-label="Your profile"><img src={AVATAR_SRC} alt="" /></Link>
    </div>
  </header>;
}
