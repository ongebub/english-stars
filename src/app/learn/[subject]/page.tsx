import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("subjects")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) notFound();
  const subject = data as Subject;

  // Content counts (not user-specific) — used to hide empty tiles
  const [{ count: pictureQuizCount }, { count: ebookPageCount }] = await Promise.all([
    supabase
      .from("picture_quiz_questions")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", subject.id),
    supabase
      .from("ebook_pages")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", subject.id)
      .eq("page_type", "storybook"),
  ]);

  const hasPictureQuiz = (pictureQuizCount ?? 0) > 0;
  const hasStorybook = (ebookPageCount ?? 0) > 0;
  const showStorybook = hasStorybook || subject.storybook_planned;

  const { data: { user } } = await supabase.auth.getUser();

  // Quiz stats
  let attemptCount = 0;
  let bestScore: number | null = null;
  let bestTotal = 10;

  // Flashcard stats
  let flashcardViewed = 0;
  let flashcardTotal = 0;
  let flashcardsComplete = false;

  // Ebook stats
  let ebookLastPage = 0;
  let ebookTotalPages = 0;
  let ebookComplete = false;

  // Picture quiz stats
  let pictureQuizAttempts = 0;
  let pictureQuizBest: number | null = null;

  // Medal
  let quizMedal: string | null = null;

  if (user) {
    // Quiz attempts
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("score, total")
      .eq("child_id", user.id)
      .eq("subject_id", subject.id);

    if (attempts && attempts.length > 0) {
      attemptCount = attempts.length;
      bestScore = Math.max(...attempts.map((a) => a.score));
      bestTotal = attempts.find((a) => a.score === bestScore)?.total || 10;
    }

    // Quiz medal
    if (bestScore !== null) {
      if (bestScore >= 10) quizMedal = "gold";
      else if (bestScore >= 8) quizMedal = "silver";
      else if (bestScore >= 6) quizMedal = "bronze";
    }

    // Flashcard progress
    const { count: totalCards } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", subject.id);

    flashcardTotal = totalCards || 0;

    if (flashcardTotal > 0) {
      const { count: viewed } = await supabase
        .from("flashcard_progress")
        .select("id", { count: "exact", head: true })
        .eq("child_id", user.id)
        .eq("subject_id", subject.id);

      flashcardViewed = viewed || 0;
      flashcardsComplete = flashcardViewed >= flashcardTotal;
    }

    // Ebook progress (storybook pages only)
    const { count: ebookPages } = await supabase
      .from("ebook_pages")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", subject.id)
      .eq("page_type", "storybook");

    ebookTotalPages = ebookPages || 0;

    if (ebookTotalPages > 0) {
      const { data: ebookProgress } = await supabase
        .from("ebook_progress")
        .select("last_page, completed")
        .eq("child_id", user.id)
        .eq("subject_id", subject.id)
        .single();

      if (ebookProgress) {
        ebookLastPage = ebookProgress.last_page || 0;
        ebookComplete = ebookProgress.completed || false;
      }
    }

    // Picture quiz attempts
    const { data: pqAttempts } = await supabase
      .from("picture_quiz_attempts")
      .select("score, total")
      .eq("child_id", user.id)
      .eq("subject_id", subject.id);

    if (pqAttempts && pqAttempts.length > 0) {
      pictureQuizAttempts = pqAttempts.length;
      pictureQuizBest = Math.max(...pqAttempts.map((a) => a.score));
    }
  }

  const stars = bestScore !== null
    ? bestScore >= (bestTotal * 0.9) ? 3 : bestScore >= (bestTotal * 0.7) ? 2 : 1
    : 0;

  const ALL_MODULES = [
    { emoji: "🃏", titleEn: "Flashcards", titleTh: "บัตรคำศัพท์", path: "flashcards", bg: "bg-sun/30", border: "#F9A825", step: 1 },
    { emoji: "📖", titleEn: "Storybook", titleTh: "หนังสือนิทาน", path: "ebook", bg: "bg-leaf/20", border: "#66BB6A", step: 2 },
    { emoji: "📚", titleEn: "Lesson Book", titleTh: "หนังสือบทเรียน", path: "lesson", bg: "bg-sky/20", border: "#0288D1", step: 3 },
    { emoji: "🧠", titleEn: "Quiz", titleTh: "แบบทดสอบ", path: "quiz", bg: "bg-coral/20", border: "#FF8A65", step: 4 },
    { emoji: "🖼️", titleEn: "Picture Quiz", titleTh: "แบบทดสอบรูปภาพ", path: "picture-quiz", bg: "bg-coral/30", border: "#E64A19", step: 5 },
    { emoji: "✏️", titleEn: "Writing", titleTh: "ฝึกเขียน", path: "writing", bg: "bg-purple/20", border: "#CE93D8", step: 6 },
  ];

  const MODULES = ALL_MODULES.filter((mod) => {
    if (mod.path === "picture-quiz" && !hasPictureQuiz) return false;
    if (mod.path === "ebook" && !showStorybook) return false;
    return true;
  });

  return (
    <section className="flex flex-col items-center pt-4">
      <span className="text-6xl">{subject.emoji}</span>
      <h1 className="font-nunito mt-3 text-2xl font-extrabold text-text-dark dark:text-gray-100">
        {subject.title_en}
      </h1>
      <p className="font-sarabun text-lg text-text-mid dark:text-gray-400">{subject.title_th}</p>

      {/* Medals display */}
      {(flashcardsComplete || quizMedal) && (
        <div className="mt-3 flex items-center gap-2">
          {flashcardsComplete && (
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf/20 px-3 py-1 text-sm font-bold">
              📗 <span className="font-nunito">Cards done</span>
            </span>
          )}
          {quizMedal === "gold" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sun/30 px-3 py-1 text-sm font-bold">
              🥇 <span className="font-nunito">Gold</span>
            </span>
          )}
          {quizMedal === "silver" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1 text-sm font-bold">
              🥈 <span className="font-nunito">Silver</span>
            </span>
          )}
          {quizMedal === "bronze" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral/20 px-3 py-1 text-sm font-bold">
              🥉 <span className="font-nunito">Bronze</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-8 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((mod) => {
          const isComingSoon = mod.path === "ebook" && !hasStorybook && subject.storybook_planned;
          const tileContent = (
            <>
              <span className="text-4xl flex-shrink-0">{mod.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-nunito text-base font-bold text-text-dark dark:text-gray-100">
                    {mod.titleEn}
                  </span>
                  <span className="text-xs text-text-light font-nunito">Step {mod.step}</span>
                </div>
                <span className="font-sarabun text-sm text-text-mid dark:text-gray-400">
                  {mod.titleTh}
                </span>
                {/* Progress info */}
                {isComingSoon && (
                  <span className="text-xs text-text-mid block italic">
                    Coming Soon / เร็วๆ นี้
                  </span>
                )}
                {mod.path === "ebook" && ebookTotalPages > 0 && (
                  <span className="text-xs text-text-mid block">
                    {ebookComplete ? (
                      <span className="text-leaf font-bold">📗 Complete! / อ่านจบแล้ว!</span>
                    ) : ebookLastPage > 0 ? (
                      <>Page {ebookLastPage} of {ebookTotalPages}</>
                    ) : (
                      <>Start Reading / เริ่มอ่าน</>
                    )}
                  </span>
                )}
                {mod.path === "flashcards" && flashcardTotal > 0 && (
                  <span className="text-xs text-text-mid block">
                    {flashcardsComplete ? (
                      <span className="text-leaf font-bold">✅ Complete / ครบแล้ว</span>
                    ) : (
                      <>{flashcardViewed} of {flashcardTotal} viewed</>
                    )}
                  </span>
                )}
                {mod.path === "quiz" && attemptCount > 0 && (
                  <span className="text-xs text-text-mid block">
                    {quizMedal === "gold" && "🥇 "}
                    {quizMedal === "silver" && "🥈 "}
                    {quizMedal === "bronze" && "🥉 "}
                    Best: {bestScore}/{bestTotal} {"⭐".repeat(stars)}
                  </span>
                )}
                {mod.path === "picture-quiz" && pictureQuizAttempts > 0 && (
                  <span className="text-xs text-text-mid block">
                    Best: {pictureQuizBest}/10{" "}
                    {"⭐".repeat(pictureQuizBest !== null ? (pictureQuizBest >= 9 ? 3 : pictureQuizBest >= 7 ? 2 : 1) : 0)}
                  </span>
                )}
              </div>
              {!isComingSoon && (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-text-light"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              )}
            </>
          );

          if (isComingSoon) {
            return (
              <div
                key={mod.path + mod.titleEn}
                className={`flex items-center gap-4 rounded-xl p-4 shadow-md opacity-60 dark:bg-gray-800 ${mod.bg}`}
                style={{ borderBottom: `4px solid ${mod.border}` }}
              >
                {tileContent}
              </div>
            );
          }

          return (
            <Link
              key={mod.path + mod.titleEn}
              href={`/learn/${slug}/${mod.path}`}
              className={`flex items-center gap-4 rounded-xl p-4 shadow-md transition-shadow hover:shadow-lg dark:bg-gray-800 ${mod.bg}`}
              style={{ borderBottom: `4px solid ${mod.border}` }}
            >
              {tileContent}
            </Link>
          );
        })}
      </div>

      <Link
        href="/learn"
        className="mt-8 inline-flex min-h-[48px] items-center rounded-xl bg-sky-dark px-6 font-nunito text-sm font-bold text-white shadow hover:bg-sky-dark/90"
      >
        ← Back to Subjects /{" "}
        <span className="font-sarabun ml-1">กลับไปเลือกวิชา</span>
      </Link>
    </section>
  );
}
