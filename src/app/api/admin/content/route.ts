import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { validateAdminUpdate, type AdminTable } from "@/lib/admin-content";

export const dynamic = "force-dynamic";

/**
 * Admin content writes.
 *
 * The internal review tools used to write to content tables directly from the
 * browser with the anon key, which required permissive RLS write policies and
 * meant any signed-in user could mutate course content. Writes now go through
 * here: the caller's session is checked against ADMIN_EMAIL, the request is
 * checked against a narrow allowlist, and only then is it executed with the
 * service role. The RLS write policies have been dropped accordingly.
 */
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  // 0. CSRF. This is a cookie-authenticated POST, so it relies on @supabase/ssr's
  //    default SameSite=Lax to suppress cross-site sends. Browsers always send
  //    Origin on POST, so rejecting a mismatched Origin closes that gap
  //    explicitly rather than depending on a cookie attribute we do not set here.
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== req.headers.get("host")) {
      return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
    }
  }

  // 1. Who is calling? Uses the cookie-bound session, not anything client-supplied.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. What are they asking for?
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { table, filterColumn, filterValue, patch } = (body ?? {}) as Record<
    string,
    never
  >;

  // Validation and execution are wrapped so an unexpected throw can never
  // surface as an unhandled 500 with a stack attached.
  try {
    const invalid = validateAdminUpdate({ table, filterColumn, filterValue, patch });
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    // 3. Execute with the service role, scoped by the validated filter.
    const admin = getAdminSupabase();
    const { error, count } = await admin
      .from(table as AdminTable)
      .update(patch as Record<string, unknown>, { count: "exact" })
      .eq(filterColumn as string, filterValue as string);

    if (error) {
      // Detail stays server-side: the raw Postgres message leaks column names
      // and types. The caller is an admin, but there is no reason to echo it.
      console.error("admin content update failed:", error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: count ?? 0 });
  } catch (err) {
    console.error("admin content update threw:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
