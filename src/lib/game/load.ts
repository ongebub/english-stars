import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subject } from "@/lib/types";
import { buildCastles, type Castle, type CastleInput } from "./rules";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

const PAGE = 1000;

/** PostgREST caps a response at 1000 rows; page through so a busy child is not truncated. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await build(from, from + PAGE - 1);
    if (!data) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** Map order: game_order when set, else sort_order; ties broken by sort_order. */
export function orderForMap(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => {
    const ao = a.game_order ?? a.sort_order;
    const bo = b.game_order ?? b.sort_order;
    return ao - bo || a.sort_order - b.sort_order;
  });
}

/**
 * Castles for one grade band, for one progress id (a child profile id, or the
 * login's own id when no child is active, exactly as resolveProgressId decides).
 * Everything is read through the caller's session, so RLS applies.
 * Derived from the real progress tables, so this works before game_progress exists.
 */
export async function loadBandCastles(
  supabase: AnyClient,
  progressId: string,
  band: string,
  isSubscribed: boolean
): Promise<{ castles: Castle[]; subjects: Subject[] }> {
  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("*")
    .eq("is_published", true)
    .eq("grade_band", band);
  const subjects = orderForMap((subjectRows ?? []) as Subject[]);
  if (subjects.length === 0) return { castles: [], subjects: [] };
  const ids = subjects.map((s) => s.id);

  const [cards, stories, quizCounts, viewed, ebook, attempts] = await Promise.all([
    supabase.from("flashcards").select("subject_id").in("subject_id", ids).limit(PAGE),
    supabase.from("ebook_pages").select("subject_id").in("subject_id", ids).eq("page_type", "storybook").limit(PAGE),
    Promise.all(
      ids.map((id) =>
        supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("subject_id", id)
      )
    ),
    fetchAll<{ subject_id: string; flashcard_id: string }>((f, t) =>
      supabase.from("flashcard_progress").select("subject_id, flashcard_id")
        .eq("child_id", progressId).in("subject_id", ids).range(f, t)
    ),
    supabase.from("ebook_progress").select("subject_id, completed")
      .eq("child_id", progressId).in("subject_id", ids),
    fetchAll<{ subject_id: string; score: number; total: number }>((f, t) =>
      supabase.from("quiz_attempts").select("subject_id, score, total")
        .eq("child_id", progressId).in("subject_id", ids).range(f, t)
    ),
  ]);

  const cardTotal = new Map<string, number>();
  for (const r of (cards.data ?? []) as { subject_id: string }[])
    cardTotal.set(r.subject_id, (cardTotal.get(r.subject_id) ?? 0) + 1);
  const hasStory = new Set(((stories.data ?? []) as { subject_id: string }[]).map((r) => r.subject_id));
  const quizCount = new Map(ids.map((id, i) => [id, quizCounts[i].count ?? 0]));
  const seen = new Map<string, Set<string>>();
  for (const r of viewed) {
    if (!seen.has(r.subject_id)) seen.set(r.subject_id, new Set());
    seen.get(r.subject_id)!.add(r.flashcard_id);
  }
  const storyDone = new Set(
    ((ebook.data ?? []) as { subject_id: string; completed: boolean | null }[])
      .filter((r) => r.completed).map((r) => r.subject_id)
  );
  // Best attempt by ratio, so a differently-sized quiz still compares fairly.
  const best = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const cur = best.get(a.subject_id);
    if (!cur || a.score * cur.total > cur.score * a.total) best.set(a.subject_id, { score: a.score, total: a.total });
  }

  const inputs: CastleInput[] = subjects.map((s) => {
    const total = cardTotal.get(s.id) ?? 0;
    const b = best.get(s.id);
    return {
      id: s.id, slug: s.slug, title_en: s.title_en, title_th: s.title_th, emoji: s.emoji,
      hasFlashcards: total > 0,
      hasStorybook: hasStory.has(s.id),
      hasQuiz: (quizCount.get(s.id) ?? 0) > 0,
      flashcardsDone: total > 0 && (seen.get(s.id)?.size ?? 0) >= total,
      storybookDone: storyDone.has(s.id),
      bestScore: b?.score ?? null,
      bestTotal: b?.total ?? null,
    };
  });
  return { castles: buildCastles(inputs, isSubscribed), subjects };
}
