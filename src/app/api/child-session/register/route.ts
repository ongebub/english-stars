import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const MAX_SESSIONS = 2;
const STALE_MINUTES = 5;

export async function POST(request: NextRequest) {
  const { child_id, device_hash, device_label, is_school } = await request.json();

  if (!child_id || !device_hash) {
    return NextResponse.json({ error: "Missing child_id or device_hash" }, { status: 400 });
  }

  // Get parent_user_id from the auth cookie if available (not for school flow)
  let parent_user_id: string | null = null;
  if (!is_school) {
    // Try to extract user from the Supabase auth cookie
    const { createClient: createServerClient } = await import("@/lib/supabase/server");
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    parent_user_id = user?.id ?? null;
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
