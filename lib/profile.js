import { createClient } from "@/lib/supabase/client";

const SETTINGS_KEY = "flowbase:settings";

// After login: copy the signed-in user's profile from Supabase into the settings that the
// Header (greeting) and the Settings page read, then tell them to refresh.
export async function syncProfileToSettings() {
  if (typeof window === "undefined") return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("first_name,last_name,email,phone")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !profile) return;

  let stored = {};
  try { stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}"); } catch {}

  const email = profile.email || user.email || "";
  const next = {
    ...stored,
    firstName: profile.first_name || email.split("@")[0] || "",   // no name saved? use the part of the email before @
    lastName: profile.last_name || "",
    email,
    phone: profile.phone || "",
    title: stored.title ?? "",                                      // clears the demo "Sales manager"
  };

  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event("flowbase:settings-updated"));
}

// When the user presses Save on the Settings page: keep their name + phone in Supabase too.
export async function saveProfileFromSettings(form) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        first_name: String(form.firstName || "").trim(),
        last_name: String(form.lastName || "").trim(),
        phone: String(form.phone || "").trim() || null,
      })
      .eq("id", user.id);
  } catch (error) {
    console.error("Could not save profile:", error);
  }
}
