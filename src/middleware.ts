import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = ["/dashboard", "/gradebook", "/school", "/tutor", "/settings"];
const semiProtectedRoutes = ["/learn"];

// Routes that should never be subscription-gated
const subscriptionExemptPaths = ["/subscribe", "/signup", "/welcome", "/join", "/api"];

/**
 * Check whether a /learn path is a subject page (needs subscription)
 * vs the grid page (public).
 *  /learn        → grid (public)
 *  /learn/       → grid (public)
 *  /learn/verbs  → subject (gated)
 *  /learn/verbs/quiz → subject (gated)
 */
function isLearnSubjectRoute(pathname: string): boolean {
  // Strip trailing slash for comparison
  const clean = pathname.replace(/\/+$/, "");
  // Exactly "/learn" is the grid
  if (clean === "/learn") return false;
  // Anything deeper is a subject route
  return clean.startsWith("/learn/");
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);

  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isSemiProtected = semiProtectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isExempt = subscriptionExemptPaths.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Fully protected routes: require Supabase auth
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Block access while 2FA is pending
  const pending2fa = request.cookies.get("es_pending_2fa");
  if (
    pending2fa &&
    pathname !== "/verify-device" &&
    !pathname.startsWith("/api/auth/") &&
    (isProtected || isSemiProtected)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-device";
    return NextResponse.redirect(url);
  }

  // ---------- Subscription gating for /learn/[subject] ----------
  if (isSemiProtected && isLearnSubjectRoute(pathname) && !isExempt) {
    // School session cookie bypasses subscription check (backwards compat)
    const hasSchoolSession = request.cookies.get("school-session");
    if (hasSchoolSession) {
      return supabaseResponse;
    }

    // Anonymous users → login
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    // Authenticated user — check subscription via SECURITY DEFINER function
    const { data: accessStatus } = await supabase.rpc("check_access_status", {
      check_user_id: user.id,
    });

    if (accessStatus !== "active") {
      const url = request.nextUrl.clone();
      url.pathname = "/subscribe";
      if (accessStatus === "tutor_lapsed") {
        url.searchParams.set("tutor_issue", "1");
      } else {
        url.searchParams.set("returnTo", pathname);
      }
      return NextResponse.redirect(url);
    }
  }

  // Semi-protected /learn grid: let through (client-side checks localStorage)
  // This keeps backwards compat for anonymous browsing the subject grid
  if (isSemiProtected && !isLearnSubjectRoute(pathname) && !user) {
    const hasSchoolSession = request.cookies.get("school-session");
    if (!hasSchoolSession) {
      // Let the page load — client-side checks localStorage
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
