import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which profile id progress rows (quiz_attempts, flashcard_progress,
 * ebook_progress, picture_quiz_attempts, trophies) are keyed to.
 *
 * Rule: if a child profile is active AND it really is a child of the logged-in
 * user, use the child's profile id. Otherwise fall back to the logged-in user's
 * own id, which is what the app always did before. The fallback means a parent
 * using the app solo, a stale/foreign child id, or a failed lookup all keep the
 * old behaviour instead of breaking or silently dropping progress.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export async function resolveProgressId(
  supabase: AnyClient,
  userId: string,
  activeChildId: string | null | undefined
): Promise<string> {
  if (!activeChildId || activeChildId === userId) return userId;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", activeChildId)
      .eq("parent_id", userId)
      .eq("role", "child")
      .is("deleted_at", null)
      .maybeSingle();
    return data?.id ?? userId;
  } catch {
    return userId;
  }
}
