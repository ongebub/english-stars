import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EbookReader } from "@/components/EbookReader";
import type { EbookPage } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ReaderPage {
  id: string;
  book_id: string;
  page_number: number;
  text_en: string;
  image_url: string | null;
  audio_url: string | null;
  word_timings: { word: string; start: number; end: number }[] | null;
}

export default async function ReaderBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("reader_books")
    .select("*")
    .eq("id", bookId)
    .eq("is_published", true)
    .single();

  if (!book) notFound();

  const { data: pages } = await supabase
    .from("reader_pages")
    .select("*")
    .eq("book_id", bookId)
    .order("page_number");

  // Map reader_pages to EbookPage shape for EbookReader component
  const ebookPages: EbookPage[] = (pages ?? []).map((p: ReaderPage) => ({
    id: p.id,
    subject_id: p.book_id,
    page_number: p.page_number,
    page_type: "reader" as const,
    text_en: p.text_en,
    image_url: p.image_url,
    audio_url: p.audio_url,
    word_timings: p.word_timings,
    created_at: "",
  }));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-md">
        <Link
          href={`/learn/read-along?level=${book.reading_level}`}
          className="inline-flex items-center gap-2 font-nunito text-sm font-semibold text-sky-dark hover:underline"
        >
          <span>◀</span>
          <span>
            Back to Stories / <span className="font-sarabun">กลับไปนิทาน</span>
          </span>
        </Link>
      </div>

      {ebookPages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-white dark:bg-gray-800 p-10 shadow-md">
          <span className="text-5xl">📖</span>
          <p className="font-nunito text-xl font-bold text-text-dark dark:text-gray-100">
            No pages yet
          </p>
          <p className="font-sarabun text-text-mid dark:text-gray-400">ยังไม่มีหน้า</p>
        </div>
      ) : (
        <EbookReader
          pages={ebookPages}
          subjectTitle={book.title_en}
          subjectId={bookId}
          subjectSlug={`read-along/${bookId}`}
        />
      )}
    </div>
  );
}
