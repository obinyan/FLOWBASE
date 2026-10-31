import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Pages anyone may open without being signed in.
const PUBLIC_PATHS = ["/", "/signup"];
const PUBLIC_PREFIXES = ["/auth/"];

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() asks Supabase to verify the session, so it cannot be faked with a copied cookie.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  const redirectTo = (target) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // keep any refreshed auth cookies on the redirect response
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && !isPublic) return redirectTo("/");
  if (user && PUBLIC_PATHS.includes(path)) return redirectTo("/dashboard");
  return response;
}
