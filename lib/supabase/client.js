import { createBrowserClient } from "@supabase/ssr";

// Use this in client components ("use client") and in lib/ files that run in the browser.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
