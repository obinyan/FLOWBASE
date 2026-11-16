import { createClient } from "@/lib/supabase/client";
import { preserveLocalAccount, resetBackendData } from "@/lib/backendSync";

// Remove every Flowbase value cached in this browser (so the next person who logs in
// on the same computer never sees the previous person's data).
export function clearLocalData() {
  if (typeof window === "undefined") return;
  resetBackendData();
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("flowbase:") && !key.startsWith("flowbase:account-backup:"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}

// Call this from a "Log out" button.
export async function signOutAndClear() {
  const supabase = createClient();
  const ownerId = window.localStorage.getItem("flowbase:cache-owner");
  if (ownerId) preserveLocalAccount(ownerId);
  resetBackendData();
  await supabase.auth.signOut();
  clearLocalData();
  window.location.assign("/");
}
