import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export async function POST(request) {
  try {
    const { workspaceId, email, role } = await request.json();
    if (!workspaceId || !email) return NextResponse.json({ error: "Workspace and email are required." }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to invite a teammate." }, { status: 401 });
    const { data: membership, error: membershipError } = await supabase.from("workspace_members")
      .select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
    if (membershipError || !["owner", "admin"].includes(membership?.role)) {
      return NextResponse.json({ error: "Only a workspace owner or admin can send invitations." }, { status: 403 });
    }
    if (!process.env.RESEND_API_KEY || !process.env.FLOWBASE_INVITE_FROM) {
      return NextResponse.json({ error: "Email sending needs RESEND_API_KEY and FLOWBASE_INVITE_FROM configured in Vercel." }, { status: 503 });
    }
    const { data: token, error: inviteError } = await supabase.rpc("create_invitation", { p_workspace: workspaceId, p_email: email, p_role: role || "member" });
    if (inviteError) throw inviteError;
    if (!token) throw new Error("Supabase did not return an invitation token.");
    const inviteOrigin = process.env.FLOWBASE_SITE_URL || new URL(request.url).origin;
    const inviteUrl = new URL("/invite", inviteOrigin);
    inviteUrl.searchParams.set("token", token);
    const safeEmail = escapeHtml(email);
    const safeRole = escapeHtml(role || "member");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FLOWBASE_INVITE_FROM,
        to: [email],
        subject: "You’ve been invited to a Flowbase workspace",
        html: `<p>You’ve been invited to join a Flowbase workspace as ${safeRole}.</p><p><a href="${inviteUrl.toString()}">Accept invitation</a></p><p>This invitation is for ${safeEmail} and expires in seven days.</p>`,
        text: `You’ve been invited to join a Flowbase workspace as ${role || "member"}. Accept here: ${inviteUrl.toString()} (for ${email}; expires in seven days).`,
      }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      return NextResponse.json({ error: detail.message || "The invitation email provider rejected the request." }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Invitation could not be sent." }, { status: 500 });
  }
}
