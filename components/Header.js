"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./Icons";
import { AVATAR_SRC } from "@/lib/config";
import { ADD_LEAD_EVENT } from "@/lib/leads";
import { readInbox as readInboxData } from "@/lib/inbox";

const greetingForHour = (hour) => hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

export default function Header() {
  const [profileName, setProfileName] = useState("John");
  const [period, setPeriod] = useState("Good morning");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [avatarSrc, setAvatarSrc] = useState(AVATAR_SRC);

  useEffect(() => {
    const update = () => setPeriod(greetingForHour(new Date().getHours()));
    const updateProfile = () => {
      try {
        const settings = JSON.parse(localStorage.getItem("flowbase:settings") || "{}");
        setProfileName(settings.firstName?.trim() || "John");
      } catch { setProfileName("John"); }
    };
    const updateAvatar = () => {
      try { setAvatarSrc(localStorage.getItem("flowbase:settings-photo") || AVATAR_SRC); }
      catch { setAvatarSrc(AVATAR_SRC); }
    };
    const readInbox = () => {
      try {
        const inbox = readInboxData();
        setUnreadMessages(inbox.messages.filter((item) => item.unread).length);
        setUnreadNotifications(inbox.notifications.filter((item) => item.unread).length);
      } catch { setUnreadMessages(0); setUnreadNotifications(0); }
    };
    const onStorage = (event) => {
      if (event.key === "flowbase:settings") updateProfile();
      if (event.key === "flowbase:settings-photo") updateAvatar();
      readInbox();
    };
    update(); updateProfile(); readInbox(); updateAvatar();
    const clock = window.setInterval(update, 60000);
    window.addEventListener("storage", onStorage);
    window.addEventListener("flowbase:settings-updated", updateProfile);
    window.addEventListener("flowbase:profile-photo-updated", updateAvatar);
    window.addEventListener("flowbase:inbox-updated", readInbox);
    return () => { window.clearInterval(clock); window.removeEventListener("storage", onStorage); window.removeEventListener("flowbase:settings-updated", updateProfile); window.removeEventListener("flowbase:profile-photo-updated", updateAvatar); window.removeEventListener("flowbase:inbox-updated", readInbox); };
  }, []);

  return <header className="panel topbar">
    <h1 className="greeting" aria-live="polite">{`${period} ${profileName}`}</h1>
    <div className="top-actions">
      {unreadMessages > 0 && <Link href="/inbox?view=messages" className="icon-btn" aria-label={`Messages, ${unreadMessages} unread`}><Icon name="mail" size={26} /><i className="dot" aria-hidden="true" /></Link>}
      {unreadNotifications > 0 && <Link href="/inbox?view=notifications" className="icon-btn" aria-label={`Notifications, ${unreadNotifications} unread`}><Icon name="bell" size={26} /><i className="dot" aria-hidden="true" /></Link>}
      <button type="button" className="btn-add" onClick={() => window.dispatchEvent(new Event(ADD_LEAD_EVENT))}><Icon name="plus" size={18} strokeWidth={2} /><span>Add lead</span></button>
      <Link href="/settings#profile" className="avatar" aria-label="Your profile"><img src={avatarSrc} alt="" /></Link>
    </div>
  </header>;
}
