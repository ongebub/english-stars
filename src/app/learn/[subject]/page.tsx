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

  // Get current user for quiz stats
  const { data: { user } } = await supabase.auth.getUser();
  let attemptCount = 0;
  let bestScore: number | null = null;
  let bestTotal = 10;

  if (user) {
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
            {/* Quiz stats */}
            {mod.path === "quiz" && attemptCount > 0 && (
              <span className="mt-1 text-xs text-text-mid">
                {attemptCount} attempt{attemptCount > 1 ? "s" : ""} &middot; Best: {bestScore}/{bestTotal}{" "}
                {"⭐".repeat(stars)}
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
