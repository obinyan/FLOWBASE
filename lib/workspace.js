import { createClient } from "@/lib/supabase/client";

let cachedId = null;
let pending = null;

export function getWorkspaceId() { return cachedId; }
export function resetWorkspace() { cachedId = null; pending = null; }

// Returns the signed-in user's workspace id. Creates a first workspace if they have none.
export function ensureWorkspace() {
  if (cachedId) return Promise.resolve(cachedId);
  if (pending) return pending;

  pending = (async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles").select("last_workspace_id").eq("id", user.id).maybeSingle();
    let id = profile?.last_workspace_id || null;

    if (!id) {
      const { data: membership } = await supabase
        .from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
      id = membership?.workspace_id || null;
    }

    if (!id) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      let result = await supabase.rpc("create_workspace",
        { p_name: "My workspace", p_currency: "USD", p_timezone: timezone });
      if (result.error) {
        // unknown timezone name? retry with UTC
        result = await supabase.rpc("create_workspace",
          { p_name: "My workspace", p_currency: "USD", p_timezone: "UTC" });
      }
      if (result.error) throw result.error;
      id = result.data;
    }

    cachedId = id;
    return id;
  })().finally(() => { pending = null; });

  return pending;
}
