import { type NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = ["/dashboard", "/gradebook", "/school", "/tutor", "/settings"];
const semiProtectedRoutes = ["/learn"];

// Routes that should never be subscription-gated
const subscriptionExemptPaths = ["/subscribe", "/signup", "/welcome", "/join", "/api"];

/** 3-day grace period in ms for past_due subscriptions */
const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

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

    // Authenticated user — check subscription
    const hasAccess = await checkSubscriptionAccess(supabase, user.id);
    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/subscribe";
      url.searchParams.set("returnTo", pathname);
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

/**
 * Check if user has subscription access, either directly or via a tutor.
 * Returns true if the user should be allowed through.
 */
async function checkSubscriptionAccess(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  userId: string
): Promise<boolean> {
  // 1. Check user's own subscription
  const { data: ownSub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .maybeSingle();

  if (ownSub) {
    if (ownSub.status === "active" || ownSub.status === "trialing") {
      return true;
    }
    // past_due: allow for 3 days after current_period_end
    if (ownSub.status === "past_due" && ownSub.current_period_end) {
      const periodEnd = new Date(ownSub.current_period_end).getTime();
      if (Date.now() < periodEnd + PAST_DUE_GRACE_MS) {
        return true;
      }
    }
  }

  // 2. Check if user is a student of a tutor who has a subscription
  //    Use service_role client to bypass RLS (student can't read tutor's subscription)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tutorLinks } = await serviceSupabase
    .from("tutor_students")
    .select("tutor_user_id")
    .eq("student_user_id", userId)
    .is("removed_at", null);

  if (tutorLinks && tutorLinks.length > 0) {
    const tutorIds = tutorLinks.map((t) => t.tutor_user_id);

    const { data: tutorSubs } = await serviceSupabase
      .from("subscriptions")
      .select("status, current_period_end")
      .in("user_id", tutorIds)
      .in("status", ["active", "trialing", "past_due"]);

    if (tutorSubs && tutorSubs.length > 0) {
      for (const sub of tutorSubs) {
        if (sub.status === "active" || sub.status === "trialing") {
          return true;
        }
        if (sub.status === "past_due" && sub.current_period_end) {
          const periodEnd = new Date(sub.current_period_end).getTime();
          if (Date.now() < periodEnd + PAST_DUE_GRACE_MS) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
