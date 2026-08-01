import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

const BAND_ORDER = ["K", "1", "2", "3", "all"];
const BAND_LABELS: Record<string, { en: string; th: string }> = {
  K:   { en: "Kindergarten",  th: "อนุบาล" },
  "1": { en: "Grade 1",      th: "ป.1" },
  "2": { en: "Grade 2",      th: "ป.2" },
  "3": { en: "Grade 3",      th: "ป.3" },
  all: { en: "All Grades",   th: "ทุกระดับชั้น" },
};

// Maps grade_band to reader reading_level
const BAND_TO_READER_LEVEL: Record<string, number> = {
  K: 1,
  "1": 2,
  "2": 3,
  "3": 3,
};

const RIBBON_COLORS = ["#0288D1", "#66BB6A", "#FF8A65", "#FFD54F", "#CE93D8"];
const FREE_SLUG = "abcs";

interface Medal {
  subject_id: string;
  flashcards_complete: boolean;
  quiz_medal: string | null;
}

export default async function LearnPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single();

  const isSubscribed = subscription?.status === "active";

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");

  // Fetch medals for this user
  const { data: medalsData } = await supabase.rpc("get_subject_medals", {
    p_child_id: user.id,
  });

  const medals: Record<string, Medal> = {};
  if (medalsData) {
    for (const m of medalsData as Medal[]) {
      medals[m.subject_id] = m;
    }
  }

  // Fetch reader book counts per level to know which grades have stories
  const { data: readerCounts } = await supabase
    .from("reader_books")
    .select("reading_level")
    .eq("is_published", true);

  const readerLevelsWithBooks = new Set(
    (readerCounts ?? []).map((r: { reading_level: number }) => r.reading_level)
  );

  // Group by grade_band, maintaining BAND_ORDER
  const grouped: Record<string, Subject[]> = {};
  for (const s of (subjects ?? []) as Subject[]) {
    const key = s.grade_band ?? "all";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  // Order bands: known bands first in BAND_ORDER, then any unknown bands alphabetically
  const bandKeys = [
    ...BAND_ORDER.filter((b) => grouped[b]),
    ...Object.keys(grouped).filter((b) => !BAND_ORDER.includes(b)).sort(),
  ];

  let cardIndex = 0;

  return (
    <section>
      <h1 className="font-nunito text-center text-3xl font-extrabold text-text-dark dark:text-gray-100">
        Choose a Subject
      </h1>
      <p className="font-sarabun mt-1 text-center text-lg text-text-mid dark:text-gray-400">
        เลือกวิชาที่จะเรียน
      </p>

      {bandKeys.map((band) => {
        const items = grouped[band];
        const label = BAND_LABELS[band] ?? { en: `Grade ${band}`, th: `ป.${band}` };
        const readerLevel = BAND_TO_READER_LEVEL[band];
        const hasReaders = readerLevel ? readerLevelsWithBooks.has(readerLevel) : false;

        return (
          <div key={band} className="mt-8">
            <h2 className="font-nunito text-xl font-bold text-text-dark dark:text-gray-100">{label.en}</h2>
            <p className="font-sarabun text-sm text-text-mid dark:text-gray-400">{label.th}</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3" data-tutorial="subject-grid">
              {items.map((subject) => {
                const isFree = subject.slug === FREE_SLUG;
                const isLocked = !isSubscribed && !isFree;
                const color = RIBBON_COLORS[cardIndex % RIBBON_COLORS.length];
                cardIndex++;

                const href = isLocked ? "/subscribe" : `/learn/${subject.slug}`;
                const medal = medals[subject.id];
                const hasFlashcardBadge = medal?.flashcards_complete;
                const quizMedal = medal?.quiz_medal;

                return (
                  <Link
                    key={subject.id}
                    href={href}
                    className={`group relative flex items-center gap-4 rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${isLocked ? "opacity-70" : ""}`}
                    style={{ borderBottom: `4px solid ${color}` }}
                  >
                    {isLocked && (
                      <span className="absolute inset-0 rounded-xl bg-gray-100/30 dark:bg-gray-700/30 pointer-events-none" />
                    )}

                    <span className={`text-4xl flex-shrink-0 ${isLocked ? "grayscale" : ""}`}>
                      {subject.emoji}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className={`font-nunito text-base font-bold block ${
                        isLocked ? "text-text-light" : "text-text-dark dark:text-gray-100"
                      }`}>
                        {subject.title_en}
                      </span>
                      <span className={`font-sarabun text-sm block ${
                        isLocked ? "text-text-light" : "text-text-mid dark:text-gray-400"
                      }`}>
                        {subject.title_th}
                      </span>

                      {/* Badges */}
                      {!isLocked && (hasFlashcardBadge || quizMedal) && (
                        <div className="flex items-center gap-1 mt-1">
                          {hasFlashcardBadge && <span className="text-xs" title="All flashcards viewed">📗</span>}
                          {quizMedal === "gold" && <span className="text-xs" title="Quiz: Gold">🥇</span>}
                          {quizMedal === "silver" && <span className="text-xs" title="Quiz: Silver">🥈</span>}
                          {quizMedal === "bronze" && <span className="text-xs" title="Quiz: Bronze">🥉</span>}
                        </div>
                      )}
                    </div>

                    {isFree ? (
                      <span className="rounded-full bg-leaf px-2 py-0.5 text-xs font-bold text-white flex-shrink-0">
                        Free / <span className="font-sarabun">ฟรี</span>
                      </span>
                    ) : isLocked ? (
                      <span className="text-text-light flex-shrink-0">🔒</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-text-light"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Read-Along Stories button at end of grade (only if that grade has published books) */}
            {hasReaders && (
              <div className="mt-4">
                <Link
                  href={`/learn/read-along?level=${readerLevel}`}
                  className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-[#0288D1] to-[#4FC3F7] p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderBottom: "4px solid #01579B" }}
                >
                  <span className="text-4xl flex-shrink-0">📖</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-nunito text-base font-bold text-white block">
                      Read-Along Stories
                    </span>
                    <span className="font-sarabun text-sm text-white/80 block">
                      นิทานอ่านตาม
                    </span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-white/70"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </Link>
              </div>
            )}
          </div>
        );
      })}

      {/* Practice Quiz button */}
      <div className="mt-12 mb-4">
        <Link
          href="/learn/practice"
          className="block w-full max-w-md mx-auto rounded-2xl p-6 text-center shadow-lg
                     bg-gradient-to-r from-[#0288D1] via-[#4FC3F7] to-[#0288D1]
                     hover:from-[#01579B] hover:via-[#0288D1] hover:to-[#01579B]
                     transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
          style={{ borderBottom: "4px solid #01579B" }}
        >
          <span className="text-5xl block mb-2">🎯</span>
          <span className="font-nunito text-2xl font-extrabold text-white block">
            Practice Quizzes
          </span>
          <span className="font-sarabun text-lg text-white/80 block">
            แบบฝึกหัด
          </span>
          <span className="text-sm text-white/60 mt-1 block">
            4 sections &middot; 4 grade levels &middot; No timer
          </span>
        </Link>
      </div>

      {/* Final Test button */}
      <div className="mt-4 mb-4">
        <Link
          href="/learn/final-test"
          className="block w-full max-w-md mx-auto rounded-2xl p-6 text-center shadow-lg
                     bg-gradient-to-r from-[#F9A825] via-[#FFD54F] to-[#F9A825]
                     hover:from-[#F57F17] hover:via-[#FFC107] hover:to-[#F57F17]
                     transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
          style={{ borderBottom: "4px solid #E65100" }}
        >
          <span className="text-5xl block mb-2">🏆</span>
          <span className="font-nunito text-2xl font-extrabold text-text-dark block">
            Final Test
          </span>
          <span className="font-sarabun text-lg text-text-dark/80 block">
            สอบปลายภาค
          </span>
          <span className="text-sm text-text-dark/60 mt-1 block">
            Comprehensive test across all subjects
          </span>
        </Link>
      </div>
    </section>
  );
}
