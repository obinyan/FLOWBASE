import { updateSession } from "@/lib/supabase/middleware";

// Next.js 15 uses the file name "middleware.js". (Next.js 16 renamed it "proxy.js".)
export async function middleware(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // run on every page except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
