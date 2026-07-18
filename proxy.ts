import { type NextRequest } from "next/server";
import { updateSession } from "./src/lib/supabase/proxy";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// This refreshes the Supabase session on every request (except static assets).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico and common image assets
     * Always run for API/data routes so protected data isn't accidentally exposed.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
