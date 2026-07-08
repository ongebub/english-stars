import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = ["/dashboard", "/gradebook", "/school"];
const semiProtectedRoutes = ["/learn"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isSemiProtected = semiProtectedRoutes.some(
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

  // Semi-protected routes: allow through if authenticated
  // School session check happens client-side via localStorage
  if (isSemiProtected && !user) {
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
