import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODULES = [
  {
    emoji: "🃏",
    titleEn: "Flashcards",
    titleTh: "บัตรคำศัพท์",
    path: "flashcards",
    bg: "bg-sun/30",
  },
  {
    emoji: "📖",
    titleEn: "E-book",
    titleTh: "หนังสือ",
    path: "ebook",
    bg: "bg-leaf/20",
  },
  {
    emoji: "🧠",
    titleEn: "Quiz",
    titleTh: "แบบทดสอบ",
    path: "quiz",
    bg: "bg-coral/20",
  },
  {
    emoji: "✏️",
    titleEn: "Writing",
    titleTh: "ฝึกเขียน",
    path: "writing",
    bg: "bg-purple/20",
  },
] as const;

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

  return (
    <section className="flex flex-col items-center">
      {/* Subject header */}
      <span className="text-6xl">{subject.emoji}</span>
      <h1 className="font-nunito mt-3 text-2xl font-extrabold text-text-dark">
        {subject.title_en}
      </h1>
      <p className="font-sarabun text-lg text-text-mid">{subject.title_th}</p>

      {/* Content module grid */}
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
          </Link>
        ))}
      </div>

      {/* Back link */}
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
