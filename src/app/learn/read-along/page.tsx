import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RIBBON_COLORS = ["#0288D1", "#66BB6A", "#FF8A65", "#FFD54F", "#CE93D8"];

// The first 16 core subjects that have storybooks
const STORY_SLUGS = [
  "abcs", "phonics-sounds", "numbers-counting", "colors",
  "shapes", "animals", "plants", "food-drink",
  "body-parts", "five-senses", "feelings-emotions", "jobs-careers",
  "vehicles", "buildings", "around-the-house", "at-school",
];

export default async function ReadAlongPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, slug, title_en, title_th, emoji, sort_order")
    .in("slug", STORY_SLUGS)
    .order("sort_order");

  return (
    <section className="flex flex-col items-center">
      <span className="text-6xl">📖</span>
      <h1 className="font-nunito mt-3 text-2xl font-extrabold text-text-dark dark:text-gray-100">
        Read-Along Stories
      </h1>
      <p className="font-sarabun text-lg text-text-mid dark:text-gray-400">
        นิทานอ่านตาม
      </p>
      <p className="text-sm text-text-light mt-1">
        Choose a story to read / เลือกนิทานที่จะอ่าน
      </p>

      <div className="mt-8 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(subjects ?? []).map((subject, i) => {
          const color = RIBBON_COLORS[i % RIBBON_COLORS.length];
          return (
            <Link
              key={subject.id}
              href={`/learn/${subject.slug}/ebook`}
              className="flex items-center gap-4 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{ borderBottom: `4px solid ${color}` }}
            >
              <span className="text-4xl flex-shrink-0">{subject.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="font-nunito text-base font-bold text-text-dark dark:text-gray-100 block">
                  {subject.title_en}
                </span>
                <span className="font-sarabun text-sm text-text-mid dark:text-gray-400 block">
                  {subject.title_th}
                </span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-text-light"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </Link>
          );
        })}
      </div>

      <Link
        href="/learn"
        className="mt-8 inline-flex min-h-[48px] items-center rounded-xl bg-sky-dark px-6 font-nunito text-sm font-bold text-white shadow hover:bg-sky-dark/90"
      >
        ← Back / <span className="font-sarabun ml-1">กลับ</span>
      </Link>
    </section>
  );
}
