import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type CardDef = {
  href: string;
  title: string;
  description: string;
  emoji: string;
  countKey: string;
  reviewKey?: string;
};

const cards: CardDef[] = [
  { href: "/admin/reader-review", title: "Reader Books (L1-L3)", description: "Review reader book pages, images, and audio", emoji: "\uD83D\uDCD6", countKey: "readerBooks" },
  { href: "/admin/subject-books", title: "Subject Storybooks", description: "Browse ebook pages by subject", emoji: "\uD83D\uDCDA", countKey: "subjectBooks", reviewKey: "unreviewedEbooks" },
  { href: "/admin/picq-review", title: "Picture Quizzes", description: "Review and flag picture quiz questions", emoji: "\uD83D\uDDBC\uFE0F", countKey: "pictureQuizzes", reviewKey: "unreviewedPicq" },
  { href: "/admin/flashcards", title: "Flashcards", description: "Browse flashcard images and audio", emoji: "\uD83C\uDCCF", countKey: "flashcards", reviewKey: "unreviewedFlashcards" },
  { href: "/admin/catalog", title: "Image Catalog", description: "Search and review all cataloged images", emoji: "\uD83D\uDDC2\uFE0F", countKey: "catalog" },
  { href: "/admin/subjects", title: "Subject Editor", description: "Edit subject titles, emoji, and publish status", emoji: "\u2699\uFE0F", countKey: "subjects" },
  { href: "/punchlist", title: "Punchlist / Roadmap", description: "Launch tracker and task list", emoji: "\uD83D\uDCCB", countKey: "" },
];

async function getCounts() {
  const supabase = await createClient();

  const [readerBooks, ebookSubjects, picqSubjects, publishedSubjects, catalogImages, totalSubjects,
    unreviewedEbooks, unreviewedPicq, unreviewedFlashcards] =
    await Promise.all([
      supabase.from("reader_books").select("id", { count: "exact", head: true }),
      supabase.from("ebook_pages").select("subject_id", { count: "exact", head: false }).then(async (res) => {
        const ids = new Set((res.data ?? []).map((r: { subject_id: string }) => r.subject_id));
        return ids.size;
      }),
      supabase.from("picture_quiz_questions").select("subject_id").then((res) => {
        const ids = new Set((res.data ?? []).map((r: { subject_id: string }) => r.subject_id));
        return ids.size;
      }),
      supabase.from("subjects").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("image_catalog").select("id", { count: "exact", head: true }),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("ebook_pages").select("id", { count: "exact", head: true }).eq("reviewed", false).not("image_url", "is", null),
      supabase.from("picture_quiz_questions").select("id", { count: "exact", head: true }).eq("reviewed", false),
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("reviewed", false).not("image_url", "is", null),
    ]);

  return {
    readerBooks: readerBooks.count ?? 0,
    subjectBooks: ebookSubjects,
    pictureQuizzes: picqSubjects,
    flashcards: publishedSubjects.count ?? 0,
    catalog: catalogImages.count ?? 0,
    subjects: totalSubjects.count ?? 0,
    unreviewedEbooks: unreviewedEbooks.count ?? 0,
    unreviewedPicq: unreviewedPicq.count ?? 0,
    unreviewedFlashcards: unreviewedFlashcards.count ?? 0,
  } as Record<string, number>;
}

export default async function AdminHubPage() {
  const counts = await getCounts();

  return (
    <div className="min-h-screen pb-8">
      <div
        className="bg-gradient-to-r from-sky-dark to-[#1565C0] text-white px-6 py-6"
        style={{ borderRadius: "0 0 24px 24px" }}
      >
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-extrabold">Admin Hub</h1>
          <p className="text-white/80 text-sm mt-1">Content management dashboard</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md
                         border border-gray-100 dark:border-gray-700
                         p-5 transition-all hover:-translate-y-0.5"
            >
              {card.reviewKey && counts[card.reviewKey] > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow">
                  {counts[card.reviewKey]}
                </span>
              )}
              <div className="text-3xl mb-3">{card.emoji}</div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                {card.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                {card.description}
              </p>
              {card.countKey && counts[card.countKey] !== undefined && (
                <div className="mt-3 text-xs font-mono text-sky-600 dark:text-sky-400">
                  {counts[card.countKey]} {card.countKey === "catalog" ? "images" : card.countKey === "subjects" ? "subjects" : "items"}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
