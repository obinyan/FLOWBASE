"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitationPage() {
  const [token, setToken] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking your invitation…");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || window.sessionStorage.getItem("flowbase:invite-token") || "";
    setToken(value);
    if (value) window.sessionStorage.setItem("flowbase:invite-token", value);
    createClient().auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setMessage(data.user ? "Accept the invitation to join this workspace." : "Sign in or create an account with the invited email address to continue.");
    }).catch(() => setMessage("Your invitation could not be checked. Please try again."));
  }, []);

  const accept = async () => {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createClient().rpc("accept_invitation", { p_token: token });
      if (error) throw error;
      window.sessionStorage.removeItem("flowbase:invite-token");
      window.location.assign("/dashboard");
    } catch (error) { setMessage(error.message || "This invitation is invalid or has expired."); }
    finally { setBusy(false); }
  };

  const authQuery = `?invite=${encodeURIComponent(token)}`;
  return <main className="auth-signin"><section className="signin-card">
    <div className="signin-topline"><span>Flowbase workspace invitation</span></div>
    <div className="signin-form"><h1>Join workspace</h1><p>{message}</p>
      {token && signedIn && <button className="signin-submit" type="button" disabled={busy} onClick={accept}>{busy ? "Joining…" : "Accept invitation"}</button>}
      {token && !signedIn && <div className="invite-auth-actions"><Link className="signin-submit" href={`/${authQuery}`}>Sign in</Link><Link className="signup-submit" href={`/signup${authQuery}`}>Create an account</Link></div>}
    </div>
  </section></main>;
}
