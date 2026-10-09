"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./Icons";
import { AVATAR_SRC } from "@/lib/config";

const KEY = "flowbase:greeting";
const DEFAULT = "Good Morning John";

export default function Header() {
  const [text, setText] = useState(DEFAULT);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setText(s); } catch {}
  }, []);

  const save = (e) => {
    const v = e.currentTarget.textContent.trim() || DEFAULT;
    setText(v);
    e.currentTarget.textContent = v;
    try { localStorage.setItem(KEY, v); } catch {}
  };

  return (
    <header className="panel topbar">
      <h1 className="greeting" contentEditable suppressContentEditableWarning
        spellCheck={false} role="textbox" aria-label="Greeting (editable)"
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}>
        {text}
      </h1>
      <div className="top-actions">
        <Link href="/messages" className="icon-btn" aria-label="Messages">
          <Icon name="mail" size={26} /><i className="dot" />
        </Link>
        <Link href="/notifications" className="icon-btn" aria-label="Notifications and reminders">
          <Icon name="bell" size={26} /><i className="dot" />
        </Link>
        <Link href="/leads/new" className="btn-add">
          <Icon name="plus" size={18} strokeWidth={2} /><span>Add lead</span>
        </Link>
        <Link href="/profile" className="avatar" aria-label="Your profile">
          <img src={AVATAR_SRC} alt="" />
        </Link>
      </div>
    </header>
  );
}
