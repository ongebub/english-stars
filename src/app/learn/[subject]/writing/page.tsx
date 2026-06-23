import Link from "next/link";

export default async function WritingPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: slug } = await params;

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="text-7xl">🖨️</span>

      <h1 className="font-nunito mt-6 text-2xl font-extrabold text-text-dark">
        Coming Soon &middot;{" "}
        <span className="font-sarabun">เร็วๆ นี้</span>
      </h1>

      <p className="font-nunito mt-3 max-w-md text-base text-text-mid">
        Writing practice sheets will be available for download soon.
      </p>
      <p className="font-sarabun mt-1 max-w-md text-base text-text-mid">
        แบบฝึกเขียนจะพร้อมให้ดาวน์โหลดเร็วๆ นี้
      </p>

      <Link
        href={`/learn/${slug}`}
        className="mt-8 inline-flex min-h-[48px] items-center rounded-xl bg-sky-dark px-6 font-nunito text-sm font-bold text-white shadow hover:bg-sky-dark/90"
      >
        ← Back to Subject /{" "}
        <span className="font-sarabun ml-1">กลับไปหน้าวิชา</span>
      </Link>
    </section>
  );
}
