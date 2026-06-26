import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Subject, QuizQuestion } from "@/lib/types";
import QuizEngine from "@/components/QuizEngine";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: slug } = await params;
  const supabase = await createClient();

  /* ── Fetch subject by slug ── */
  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!subjectData) notFound();

  const subject = subjectData as Subject;

  /* ── Fetch all quiz questions for this subject ── */
  console.log(`[Quiz] Fetching questions for subject: ${subject.title_en} (id: ${subject.id}, slug: ${slug})`);

  const { data: questionsData, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("subject_id", subject.id)
    .limit(60);

  if (questionsError) {
    console.error("[Quiz] Error fetching questions:", questionsError);
  }

  const questions = (questionsData ?? []) as QuizQuestion[];
  console.log(`[Quiz] Fetched ${questions.length} questions for ${subject.title_en}`);

  /* ── Not enough questions ── */
  if (questions.length < 1) {
    return (
      <section className="flex flex-col items-center py-12">
        <span className="text-6xl">🧠</span>
        <h1 className="font-nunito mt-4 text-2xl font-extrabold text-text-dark">
          No quiz questions yet
        </h1>
        <p className="font-sarabun mt-1 text-lg text-text-mid">
          ยังไม่มีคำถามในแบบทดสอบ
        </p>
        <Link
          href={`/learn/${slug}`}
          className="mt-8 inline-flex min-h-[48px] items-center rounded-xl bg-sky-dark px-6 font-nunito text-sm font-bold text-white shadow hover:bg-sky-dark/90"
        >
          ← Back to {subject.title_en} /{" "}
          <span className="font-sarabun ml-1">กลับ</span>
        </Link>
      </section>
    );
  }

  return (
    <QuizEngine
      questions={questions}
      subjectId={subject.id}
      subjectSlug={slug}
      subjectTitle={subject.title_en}
    />
  );
}
