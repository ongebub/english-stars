import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProgressIdServer } from "@/lib/progress-id.server";
import { loadBandCastles } from "@/lib/game/load";
import { isMapBand } from "@/lib/game/rules";
import { CastleScreen, STEP_INFO } from "@/components/game/CastleScreen";
import { mapHref } from "@/lib/game/context";
import { getLearnMode } from "@/lib/game/mode.server";
import type { Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Guided castle screen (Phase 3). Game context only: the map links here instead of
 * to the plain subject page. Steps run in order; each activity returns here (or on
 * to the next step with ?go=next). Tutor mode never links to this route.
 */
export default async function CastlePage({
  params, searchParams,
}: { params: Promise<{ subject: string }>; searchParams: Promise<{ go?: string }> }) {
  const { subject: slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/learn/${slug}/castle`);

  if ((await getLearnMode(supabase, user.id)).mode === "tutor") redirect(`/learn/${slug}`);

  const { data } = await supabase.from("subjects").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!data) notFound();
  const subject = data as Subject;
  if (!isMapBand(subject.grade_band)) redirect(`/learn/${slug}`); // e.g. Interview Practice: no castle

  const progressId = await getProgressIdServer(supabase, user.id);
  const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  const { castles } = await loadBandCastles(supabase, progressId, subject.grade_band, sub?.status === "active");
  const castle = castles.find((c) => c.slug === slug);
  if (!castle) redirect(`/learn/${slug}`);
  if (castle.status === "locked") redirect(mapHref(subject.grade_band));
  if (castle.paywalled) redirect("/subscribe");

  const { count: pictureCount } = await supabase
    .from("picture_quiz_questions").select("id", { count: "exact", head: true }).eq("subject_id", subject.id);
  const hasPicture = (pictureCount ?? 0) > 0;

  const steps = castle.steps;
  const firstTodo = steps.findIndex((s) => !s.done);
  if (sp.go === "next" && firstTodo >= 0) redirect(`/learn/${slug}/${STEP_INFO[steps[firstTodo].key].path}`);

  return (
    <CastleScreen slug={slug} band={subject.grade_band} emoji={subject.emoji} titleEn={subject.title_en} titleTh={subject.title_th}
      castle={castle} hasPicture={hasPicture} />
  );
}
