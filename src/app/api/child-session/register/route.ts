import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SESSIONS = 2;
const STALE_MINUTES = 5;

export async function POST(request: NextRequest) {
  const { child_id, device_hash, device_label, is_school } = await request.json();

  if (!child_id || !device_hash) {
    return NextResponse.json({ error: "Missing child_id or device_hash" }, { status: 400 });
  }

  // AUTHORISATION. The service-role client below bypasses RLS, so ownership of
  // child_id must be proven here or anyone could create/kick sessions for any child.
  if (typeof child_id !== "string" || !UUID.test(child_id)) {
    return NextResponse.json({ error: "Invalid child_id" }, { status: 400 });
  }
  let parent_user_id: string | null = null;
  if (!is_school) {
    // Family flow: caller must be logged in and the child must be theirs
    // (same rule as resolveProgressId: parent_id = caller, role child, not deleted).
    const { createClient: createServerClient } = await import("@/lib/supabase/server");
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { data: child } = await supabase
      .from("profiles").select("id")
      .eq("id", child_id).eq("parent_id", user.id).eq("role", "child").is("deleted_at", null)
      .maybeSingle();
    if (!child) return NextResponse.json({ error: "Not your child profile" }, { status: 403 });
    parent_user_id = user.id;
  } else {
    // School flow: the child has no login. /api/join created a school profile with a
    // random UUID that only that device was given, so the UUID is the credential.
    // Accept only a live school profile whose class code still exists and is unexpired;
    // a family child's id cannot be registered through this branch.
    const { data: child } = await supabase
      .from("profiles").select("id, join_code")
      .eq("id", child_id).eq("role", "child").eq("account_type", "school")
      .is("deleted_at", null).not("join_code", "is", null)
      .maybeSingle();
    const { data: code } = child
      ? await supabase.from("school_codes").select("expires_at").eq("code", child.join_code).maybeSingle()
      : { data: null };
    if (!child || !code || new Date(code.expires_at) < new Date()) {
      return NextResponse.json({ error: "Not a valid school session" }, { status: 403 });
    }
  }

  // Check if this device already has a session for this child — update it
  const { data: existing } = await supabase
    .from("child_sessions")
    .select("id")
    .eq("child_id", child_id)
    .eq("device_hash", device_hash)
    .limit(1)
    .single();

  if (existing) {
    await supabase
      .from("child_sessions")
      .update({ last_seen_at: new Date().toISOString(), device_label })
      .eq("id", existing.id);
    return NextResponse.json({ session_id: existing.id });
  }

  // Clean up stale sessions (not seen in 5+ minutes)
  await supabase
    .from("child_sessions")
    .delete()
    .eq("child_id", child_id)
    .lt("last_seen_at", new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString());

  // Count remaining active sessions for this child
  const { count } = await supabase
    .from("child_sessions")
    .select("*", { count: "exact", head: true })
    .eq("child_id", child_id);

  // If at or over limit, kick the oldest
  if (count !== null && count >= MAX_SESSIONS) {
    const { data: oldest } = await supabase
      .from("child_sessions")
      .select("id")
      .eq("child_id", child_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (oldest) {
      await supabase.from("child_sessions").delete().eq("id", oldest.id);
    }
  }

  // Insert new session
  const { data: newSession, error } = await supabase
    .from("child_sessions")
    .insert({
      child_id,
      device_hash,
      device_label,
      parent_user_id,
      is_school: is_school || false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session_id: newSession.id });
}
