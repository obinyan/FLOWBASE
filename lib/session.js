import { createClient } from "@/lib/supabase/client";

// Remove every Flowbase value cached in this browser (so the next person who logs in
// on the same computer never sees the previous person's data).
export function clearLocalData() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("flowbase:"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}

// Call this from a "Log out" button.
export async function signOutAndClear() {
  const supabase = createClient();
  await supabase.auth.signOut();
  clearLocalData();
  window.location.assign("/");
}
