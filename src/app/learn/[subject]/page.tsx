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

  const { data: { user } } = await supabase.auth.getUser();

  // Quiz stats
  let attemptCount = 0;
  let bestScore: number | null = null;
  let bestTotal = 10;

  // Flashcard stats
  let flashcardViewed = 0;
  let flashcardTotal = 0;
  let flashcardsComplete = false;

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
  }

  const stars = bestScore !== null
    ? bestScore >= (bestTotal * 0.9) ? 3 : bestScore >= (bestTotal * 0.7) ? 2 : 1
    : 0;

  const MODULES = [
    { emoji: "🃏", titleEn: "Flashcards", titleTh: "บัตรคำศัพท์", path: "flashcards", bg: "bg-sun/30" },
    { emoji: "📖", titleEn: "E-book", titleTh: "หนังสือ", path: "ebook", bg: "bg-leaf/20" },
    { emoji: "🧠", titleEn: "Quiz", titleTh: "แบบทดสอบ", path: "quiz", bg: "bg-coral/20" },
    { emoji: "✏️", titleEn: "Writing", titleTh: "ฝึกเขียน", path: "writing", bg: "bg-purple/20" },
  ] as const;

  return (
    <section className="flex flex-col items-center">
      <span className="text-6xl">{subject.emoji}</span>
      <h1 className="font-nunito mt-3 text-2xl font-extrabold text-text-dark">
        {subject.title_en}
      </h1>
      <p className="font-sarabun text-lg text-text-mid">{subject.title_th}</p>

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

      <div className="mt-8 grid w-full grid-cols-2 gap-4">
        {MODULES.map((mod) => (
          <Link
            key={mod.path}
            href={`/learn/${slug}/${mod.path}`}
            className={`flex min-h-[140px] flex-col items-center justify-center rounded-xl p-5 shadow-md transition-shadow hover:shadow-lg ${mod.bg}`}
          >
            <span className="text-5xl">{mod.emoji}</span>
            <span className="font-nunito mt-2 text-center text-base font-bold text-text-dark">
              {mod.titleEn}
            </span>
            <span className="font-sarabun text-center text-sm text-text-mid">
              {mod.titleTh}
            </span>

            {/* Flashcard progress */}
            {mod.path === "flashcards" && flashcardTotal > 0 && (
              <span className="mt-1 text-xs text-text-mid">
                {flashcardsComplete ? (
                  <span className="text-leaf font-bold">✅ Complete / ครบแล้ว</span>
                ) : (
                  <>{flashcardViewed} of {flashcardTotal} viewed</>
                )}
              </span>
            )}

            {/* Quiz stats */}
            {mod.path === "quiz" && attemptCount > 0 && (
              <span className="mt-1 text-xs text-text-mid">
                {quizMedal === "gold" && "🥇 Gold · "}
                {quizMedal === "silver" && "🥈 Silver · "}
                {quizMedal === "bronze" && "🥉 Bronze · "}
                Best: {bestScore}/{bestTotal}{" "}
                {"⭐".repeat(stars)}
              </span>
            )}
            {mod.path === "quiz" && attemptCount > 0 && (
              <span className="text-xs text-text-light">
                {attemptCount} attempt{attemptCount > 1 ? "s" : ""}
              </span>
            )}
          </Link>
        ))}
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
