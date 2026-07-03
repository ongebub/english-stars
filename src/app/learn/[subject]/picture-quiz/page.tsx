import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Subject, PictureQuizQuestion } from "@/lib/types";
import PictureQuizEngine from "@/components/PictureQuizEngine";

export const dynamic = "force-dynamic";

export default async function PictureQuizPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: slug } = await params;
  const supabase = await createClient();

  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!subjectData) notFound();
  const subject = subjectData as Subject;

  const { data: questionsData } = await supabase
    .from("picture_quiz_questions")
    .select("*")
    .eq("subject_id", subject.id);

  const questions = (questionsData ?? []) as PictureQuizQuestion[];

  if (questions.length < 1) {
    return (
      <section className="flex flex-col items-center py-12">
        <span className="text-6xl">🖼️</span>
        <h1 className="font-nunito mt-4 text-2xl font-extrabold text-text-dark">
          No picture quiz yet
        </h1>
        <p className="font-sarabun mt-1 text-lg text-text-mid">
          ยังไม่มีแบบทดสอบรูปภาพ
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
    <PictureQuizEngine
      questions={questions}
      subjectId={subject.id}
      subjectSlug={slug}
      subjectTitle={subject.title_en}
    />
  );
}
