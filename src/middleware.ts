import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = ["/dashboard", "/gradebook", "/school"];
// /learn is semi-protected: requires auth OR school session (checked client-side)
const semiProtectedRoutes = ["/learn"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Fully protected routes: require Supabase auth
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Semi-protected routes: allow through if authenticated
  // School session check happens client-side via localStorage
  // If no auth, we let the page load and it will check for school session
  const isSemiProtected = semiProtectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isSemiProtected && !user) {
    // Check for school-session cookie/header (set by /join flow)
    const hasSchoolSession = request.cookies.get("school-session");
    if (!hasSchoolSession) {
      // Let the page load anyway - client-side will check localStorage
      // and redirect to /login or /join if no session found
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
