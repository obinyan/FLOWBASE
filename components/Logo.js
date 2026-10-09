import Link from "next/link";
import { LOGO_SRC } from "@/lib/config";

// Logo + "FLOWBASE" wordmark. The whole thing is one link back to the dashboard.
export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Flowbase – go to dashboard">
      {/* Logo slot: set LOGO_SRC in lib/config.js, or drop an <img> in here */}
      <span className="logo-slot">
        {LOGO_SRC ? <img src={LOGO_SRC} alt="" /> : null}
      </span>
      <span className="wordmark">FLOWBASE</span>
    </Link>
  );
}
