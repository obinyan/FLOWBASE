"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

function Brand({ className = "" }) {
  return <Link href="/" className={`auth-brand ${className}`} aria-label="Flowbase"><span>FLOWBASE</span></Link>;
}

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true">G</span>;
}

function Eye({ hidden }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>{hidden && <path d="m4 4 16 16"/>}</svg>;
}

function AuthForm({ mode }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === "signup";

  function submit(event) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return isSignup ? (
    <main className="auth-signup">
      <section className="signup-story" aria-label="Getting started with Flowbase">
        <Brand className="story-brand" />
        <div className="story-bottom"><div><h1>Get Started<br />with Us</h1></div><p>Complete these easy steps<br />to register your account</p></div>
        <ol className="signup-steps">
          <li className="current"><span>1</span><b>Sign up your<br />account</b></li>
          <li><span>2</span><b>Set up your<br />workspace</b></li>
          <li><span>3</span><b>Set up your<br />profile</b></li>
        </ol>
      </section>
      <section className="signup-form-wrap">
        <div className="signup-heading"><h2>Create your Account</h2><p>Get your pipeline moving with Flowbase</p></div>
        <form className="signup-form" onSubmit={submit}>
          <button className="google-button" type="button" onClick={() => router.push("/dashboard")}><GoogleMark /><span>Sign up with Google</span></button>
          <div className="auth-or"><span />or<span /></div>
          <label className="signup-field">Full name<input type="text" name="name" placeholder="Your name" autoComplete="name" /></label>
          <label className="signup-field">Work email<input type="email" name="email" placeholder="you@company.com" autoComplete="email" /></label>
          <label className="signup-field">Password<span className="password-input"><input type={showPassword ? "text" : "password"} name="password" placeholder="Create a password" autoComplete="new-password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}><Eye hidden={!showPassword} /></button></span></label>
          <small className="password-hint">Must be at least 8 characters</small>
          <button className="signup-submit" type="submit">Create account</button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/">Log In</Link></p>
      </section>
    </main>
  ) : (
    <main className="auth-signin">
      <div className="signin-left">
        <Brand className="signin-brand" />
        <div className="orbit-art" aria-hidden="true"><i className="orbit-line vertical"/><i className="orbit-line horizontal-left"/><i className="orbit-line horizontal-right"/><i className="orbit-line diagonal-one"/><i className="orbit-line diagonal-two"/><i className="orbit-line diagonal-three"/><i className="orbit-line diagonal-four"/><i className="orbit-center"/></div>
      </div>
      <section className="signin-card">
        <div className="signin-topline"><span>Welcome back to your workspace</span><Link href="/signup">Create an account</Link></div>
        <form className="signin-form" onSubmit={submit}>
          <h1>Login</h1>
          <div className="signin-fields">
            <label>Email<input type="email" name="email" autoComplete="email" /></label>
            <label>Password<span className="password-input"><input type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}><Eye hidden={!showPassword} /></button></span></label>
          </div>
          <div className="signin-options"><label><input type="checkbox" name="remember" />Remember me</label><button type="button" onClick={() => window.alert("Password recovery will be available in a future version.")}>Forgot?</button></div>
          <div className="auth-or"><span />or<span /></div>
          <button className="google-button" type="button" onClick={() => router.push("/dashboard")}><GoogleMark /><span>Continue with Google</span></button>
          <button className="signin-submit" type="submit">SIGN IN</button>
        </form>
      </section>
    </main>
  );
}

export default function AuthPage({ mode }) {
  return <div className={`auth-page ${mode === "signup" ? "is-signup" : "is-signin"}`}><AuthForm mode={mode} /></div>;
}
