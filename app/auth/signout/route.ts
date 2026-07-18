import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";

// POST /auth/signout — clears the session and returns to /login.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
