import { createClient } from "@/lib/supabase/client";
import { ensureWorkspace, resetWorkspace } from "@/lib/workspace";
import { refreshLeads, resetLeads, scheduleRefreshLeads } from "@/lib/leads";
import { clearLocalData } from "@/lib/session";

const OWNER_KEY = "flowbase:cache-owner";
let started = false;
let activeUser = null;
let channel = null;

async function bootstrap(user) {
  if (activeUser === user.id) return;
  activeUser = user.id;

  // A different person is now using this browser: drop the previous person's cached data.
  const previousOwner = window.localStorage.getItem(OWNER_KEY);
  if (previousOwner && previousOwner !== user.id) clearLocalData();
  window.localStorage.setItem(OWNER_KEY, user.id);

  try {
    const workspaceId = await ensureWorkspace();
    if (!workspaceId) return;
    await refreshLeads();
    subscribe(workspaceId);
  } catch (error) {
    console.error("Flowbase sync failed to start:", error);
  }
}

function subscribe(workspaceId) {
  const supabase = createClient();
  if (channel) supabase.removeChannel(channel);
  channel = supabase
    .channel(`workspace-${workspaceId}`)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "leads", filter: `workspace_id=eq.${workspaceId}` },
      () => scheduleRefreshLeads())
    .subscribe();
}

function teardown() {
  const supabase = createClient();
  if (channel) { supabase.removeChannel(channel); channel = null; }
  activeUser = null;
  resetWorkspace();
  resetLeads();
  clearLocalData();
}

// Call once from AppShell. Safe to call many times.
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const supabase = createClient();
  // (Supabase asks us not to call its API inside this callback, hence setTimeout.)
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) setTimeout(() => bootstrap(session.user), 0);
    else if (event === "SIGNED_OUT") setTimeout(teardown, 0);
  });
}
