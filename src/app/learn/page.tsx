import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODULE_LABELS: Record<string, { en: string; th: string }> = {
  "1": { en: "Module 1: PreK – 1st Grade", th: "โมดูล 1" },
  "2": { en: "Module 2: 1st – 2nd Grade", th: "โมดูล 2" },
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
    .order("module")
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

  const grouped: Record<string, Subject[]> = {};
  for (const s of (subjects ?? []) as Subject[]) {
    const key = String(s.module);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  let cardIndex = 0;

  return (
    <section>
      <h1 className="font-nunito text-center text-3xl font-extrabold text-text-dark dark:text-gray-100">
        Choose a Subject
      </h1>
      <p className="font-sarabun mt-1 text-center text-lg text-text-mid dark:text-gray-400">
        เลือกวิชาที่จะเรียน
      </p>

      {Object.entries(grouped).map(([mod, items]) => {
        const label = MODULE_LABELS[mod] ?? { en: `Module ${mod}`, th: `โมดูล ${mod}` };

        return (
          <div key={mod} className="mt-8">
            <h2 className="font-nunito text-xl font-bold text-text-dark dark:text-gray-100">{label.en}</h2>
            <p className="font-sarabun text-sm text-text-mid dark:text-gray-400">{label.th}</p>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
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
                    className="group relative flex min-h-[140px] flex-col items-center justify-center rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderBottom: `4px solid ${color}` }}
                  >
                    {/* Badges: top-right corner */}
                    <div className="absolute right-2 top-2 flex flex-col items-end gap-0.5">
                      {isFree ? (
                        <span className="rounded-full bg-leaf px-2 py-0.5 text-xs font-bold text-white">
                          Free &middot; <span className="font-sarabun">ฟรี</span>
                        </span>
                      ) : isLocked ? (
                        <span className="text-text-light">🔒</span>
                      ) : null}

                      {/* Medal badges */}
                      {!isLocked && hasFlashcardBadge && (
                        <span className="rounded-full bg-leaf/20 px-1.5 py-0.5 text-xs" title="All flashcards viewed">
                          📗
                        </span>
                      )}
                      {!isLocked && quizMedal === "gold" && (
                        <span className="rounded-full bg-sun/30 px-1.5 py-0.5 text-xs" title="Quiz: Gold">
                          🥇
                        </span>
                      )}
                      {!isLocked && quizMedal === "silver" && (
                        <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs" title="Quiz: Silver">
                          🥈
                        </span>
                      )}
                      {!isLocked && quizMedal === "bronze" && (
                        <span className="rounded-full bg-coral/20 px-1.5 py-0.5 text-xs" title="Quiz: Bronze">
                          🥉
                        </span>
                      )}
                    </div>

                    {isLocked && (
                      <span className="absolute inset-0 rounded-xl bg-gray-100/50 dark:bg-gray-700/50 pointer-events-none" />
                    )}

                    <span className={`text-5xl ${isLocked ? "opacity-50 grayscale" : ""}`}>
                      {subject.emoji}
                    </span>
                    <span className={`font-nunito mt-2 text-center text-base font-bold ${
                      isLocked ? "text-text-light" : "text-text-dark dark:text-gray-100"
                    }`}>
                      {subject.title_en}
                    </span>
                    <span className={`font-sarabun text-center text-sm ${
                      isLocked ? "text-text-light" : "text-text-mid dark:text-gray-400"
                    }`}>
                      {subject.title_th}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
