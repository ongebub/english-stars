import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RIBBON_COLORS = ["#0288D1", "#66BB6A", "#FF8A65", "#FFD54F", "#CE93D8"];

const LEVEL_LABELS: Record<number, { en: string; th: string }> = {
  1: { en: "Kindergarten", th: "อนุบาล" },
  2: { en: "Grade 1", th: "ป.1" },
  3: { en: "Grades 2–3", th: "ป.2–3" },
};

export default async function ReadAlongPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const level = params.level ? parseInt(params.level, 10) : null;

  // Fetch published reader books, optionally filtered by level
  let query = supabase
    .from("reader_books")
    .select("id, title_en, title_th, reading_level, sort_order, cover_image_url")
    .eq("is_published", true)
    .order("reading_level")
    .order("sort_order");

  if (level) {
    query = query.eq("reading_level", level);
  }

  const { data: books } = await query;

  const levelLabel = level ? LEVEL_LABELS[level] : null;

  return (
    <section className="flex flex-col items-center pt-4">
      <span className="text-6xl">📖</span>
      <h1 className="font-nunito mt-3 text-2xl font-extrabold text-text-dark dark:text-gray-100">
        Read-Along Stories
      </h1>
      {levelLabel && (
        <p className="font-nunito text-lg font-bold text-sky-dark dark:text-sky-400">
          {levelLabel.en} <span className="font-sarabun">{levelLabel.th}</span>
        </p>
      )}
      <p className="font-sarabun text-sm text-text-mid dark:text-gray-400 mt-1">
        เลือกนิทานที่จะอ่าน
      </p>

      <div className="mt-8 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(books ?? []).map((book, i) => {
          const color = RIBBON_COLORS[i % RIBBON_COLORS.length];
          return (
            <Link
              key={book.id}
              href={`/learn/read-along/${book.id}`}
              className="flex items-center gap-4 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{ borderBottom: `4px solid ${color}` }}
            >
              <span className="text-4xl flex-shrink-0">📖</span>
              <div className="flex-1 min-w-0">
                <span className="font-nunito text-base font-bold text-text-dark dark:text-gray-100 block">
                  {book.title_en}
                </span>
                {book.title_th && (
                  <span className="font-sarabun text-sm text-text-mid dark:text-gray-400 block">
                    {book.title_th}
                  </span>
                )}
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
