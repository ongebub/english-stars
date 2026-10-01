import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getProgressIdServer } from "@/lib/progress-id.server";
import { loadBandCastles } from "@/lib/game/load";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST { subject_id }  ->  recompute one castle on the server and record it.
 *
 * Honesty rules:
 *  - The caller only names a subject. Who the progress belongs to is decided here
 *    from the session + active-child cookie (resolveProgressId verifies the child
 *    is this user's), never from the request body.
 *  - The result is derived from quiz_attempts / flashcard_progress / ebook_progress
 *    read through the caller's own session (RLS), not from any score the client sends.
 *  - game_progress has no client write path at all; this route writes it with the
 *    service role. completed_at, once set, is never cleared.
 *
 * If the game_progress table has not been created yet, this still returns the
 * computed result with persisted:false rather than failing.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let subjectId: unknown;
  try { subjectId = (await req.json())?.subject_id; } catch { /* falls through */ }
  if (typeof subjectId !== "string" || !UUID.test(subjectId)) {
    return NextResponse.json({ error: "subject_id required" }, { status: 400 });
  }

  const { data: subject } = await supabase
    .from("subjects").select("id, grade_band").eq("id", subjectId).eq("is_published", true).maybeSingle();
  if (!subject) return NextResponse.json({ error: "Unknown subject" }, { status: 404 });

  const progressId = await getProgressIdServer(supabase, user.id);
  const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  const { castles } = await loadBandCastles(supabase, progressId, subject.grade_band, sub?.status === "active");
  const castle = castles.find((c) => c.id === subjectId);
  if (!castle) return NextResponse.json({ error: "Subject is not on a map" }, { status: 404 });

  const complete = castle.status === "complete";
  const idx = castles.findIndex((c) => c.id === subjectId);
  const next = complete ? castles[idx + 1] ?? null : null;
  const result = {
    complete,
    flag_level: castle.flag,
    best_quiz_score: castle.bestScore,
    best_quiz_total: castle.bestTotal,
    next_subject_slug: next?.slug ?? null,
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ...result, persisted: false, reason: "no service key" });
  const admin = createServiceClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error: readErr } = await admin
    .from("game_progress").select("completed_at, unlocked_at")
    .eq("child_id", progressId).eq("subject_id", subjectId).maybeSingle();
  if (readErr) {
    // Table not applied yet (or not reachable). Not an error for the caller.
    return NextResponse.json({ ...result, persisted: false, reason: "game_progress unavailable" });
  }

  const now = new Date().toISOString();
  const { error: upErr } = await admin.from("game_progress").upsert({
    child_id: progressId,
    subject_id: subjectId,
    unlocked_at: existing?.unlocked_at ?? now,
    completed_at: existing?.completed_at ?? (complete ? now : null),
    best_quiz_score: castle.bestScore,
    best_quiz_total: castle.bestTotal,
    flashcards_done: castle.flashcardsDone,
    storybook_done: castle.storybookDone,
    flag_level: castle.flag,
    updated_at: now,
  }, { onConflict: "child_id,subject_id" });
  if (upErr) return NextResponse.json({ ...result, persisted: false, reason: "write failed" });

  return NextResponse.json({
    ...result,
    persisted: true,
    newly_completed: complete && !existing?.completed_at,
  });
}
