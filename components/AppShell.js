"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Logo from "./Logo";
import Icon from "./Icons";

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main">
        <div className="mobilebar">
          <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" size={26} />
          </button>
          <Logo />
        </div>
        <Header />
        {children}
      </div>
    </div>
  );
}
