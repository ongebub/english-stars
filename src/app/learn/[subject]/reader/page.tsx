import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EbookReader } from "@/components/EbookReader";
import type { Subject, EbookPage } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subject: string }>;
}

export default async function ReaderPage({ params }: PageProps) {
  const { subject: slug } = await params;
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("slug", slug)
    .single<Subject>();

  if (!subject) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="font-nunito text-xl font-bold text-text-dark">
          Subject not found
        </p>
        <p className="font-sarabun text-text-mid">ไม่พบวิชานี้</p>
        <Link
          href="/learn"
          className="mt-4 inline-block rounded-xl bg-sky-dark px-6 py-3 font-nunito font-bold text-white"
        >
          Back to Home / <span className="font-sarabun">กลับหน้าหลัก</span>
        </Link>
      </div>
    );
  }

  // Fetch reader pages for this subject
  const { data: pages } = await supabase
    .from("ebook_pages")
    .select("*")
    .eq("subject_id", subject.id)
    .eq("page_type", "reader")
    .order("page_number", { ascending: true })
    .returns<EbookPage[]>();

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-md">
        <Link
          href={`/learn/${slug}`}
          className="inline-flex items-center gap-2 font-nunito text-sm font-semibold text-sky-dark hover:underline"
        >
          <span>◀</span>
          <span>
            Back to {subject.title_en} /{" "}
            <span className="font-sarabun">กลับไป{subject.title_th}</span>
          </span>
        </Link>
      </div>

      {!pages || pages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-10 shadow-md">
          <span className="text-5xl">🎧</span>
          <p className="font-nunito text-xl font-bold text-text-dark">
            No read-along story yet
          </p>
          <p className="font-sarabun text-text-mid">ยังไม่มีนิทานอ่านตาม</p>
          <Link
            href={`/learn/${slug}`}
            className="mt-2 inline-block rounded-xl bg-sky-dark px-6 py-3 font-nunito font-bold text-white"
          >
            Go Back / <span className="font-sarabun">กลับ</span>
          </Link>
        </div>
      ) : (
        <EbookReader pages={pages} subjectTitle={subject.title_en} subjectId={subject.id} subjectSlug={slug} />
      )}
    </div>
  );
}
