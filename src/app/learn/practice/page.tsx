import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SECTIONS = ["expression", "reading", "structure", "vocabulary"] as const;
const BANDS = ["K", "1", "2", "3"] as const;

const SECTION_META: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  expression: { label: "Expression", emoji: "💬", color: "#0288D1" },
  reading: { label: "Reading", emoji: "📖", color: "#66BB6A" },
  structure: { label: "Structure", emoji: "🔧", color: "#FF8A65" },
  vocabulary: { label: "Vocabulary", emoji: "📝", color: "#CE93D8" },
};

const BAND_LABELS: Record<string, string> = {
  K: "Kindergarten",
  "1": "Grade 1",
  "2": "Grade 2",
  "3": "Grade 3",
};

const BAND_LABELS_TH: Record<string, string> = {
  K: "อนุบาล",
  "1": "ป.1",
  "2": "ป.2",
  "3": "ป.3",
};

export default async function PracticeQuizBrowsePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate: subscription required
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (subscription?.status !== "active") {
    redirect("/subscribe");
  }

  // Fetch all practice quizzes
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, section, grade_band, title_en")
    .eq("kind", "practice_quiz")
    .eq("is_published", true);

  // Build lookup: section_band -> assessment
  const quizLookup: Record<string, { id: string; title_en: string }> = {};
  for (const a of assessments ?? []) {
    if (a.section && a.grade_band) {
      quizLookup[`${a.section}_${a.grade_band}`] = {
        id: a.id,
        title_en: a.title_en,
      };
    }
  }

  // Fetch user's best attempts for practice quizzes
  const assessmentIds = (assessments ?? []).map((a) => a.id);
  const { data: attempts } = assessmentIds.length
    ? await supabase
        .from("assessment_attempts")
        .select(
          "assessment_id, points_earned, points_possible, submitted_at"
        )
        .eq("user_id", user.id)
        .in("assessment_id", assessmentIds)
        .not("submitted_at", "is", null)
        .order("points_earned", { ascending: false })
    : { data: [] };

  const bestAttempts: Record<
    string,
    { points_earned: number; points_possible: number }
  > = {};
  for (const a of attempts ?? []) {
    if (!bestAttempts[a.assessment_id] && a.points_earned != null) {
      bestAttempts[a.assessment_id] = {
        points_earned: a.points_earned,
        points_possible: a.points_possible,
      };
    }
  }

  return (
    <section className="pb-12">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-2">🎯</span>
        <h1 className="font-nunito text-3xl font-extrabold text-text-dark dark:text-gray-100">
          Practice Quizzes
        </h1>
        <p className="font-sarabun text-lg text-text-mid dark:text-gray-400 mt-1">
          แบบฝึกหัด
        </p>
        <p className="font-nunito text-sm text-text-mid dark:text-gray-400 mt-2 max-w-md mx-auto">
          15 questions &middot; 1 point each &middot; No timer &middot; See
          correct answers after
        </p>
      </div>

      {/* 4x4 Grid: Sections as columns, Grade bands as rows */}
      <div className="max-w-3xl mx-auto">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-4 gap-3 mb-3 px-2">
          {SECTIONS.map((section) => {
            const meta = SECTION_META[section];
            return (
              <div
                key={section}
                className="text-center font-nunito text-sm font-bold"
                style={{ color: meta.color }}
              >
                <span className="text-xl block">{meta.emoji}</span>
                {meta.label}
              </div>
            );
          })}
        </div>

        {/* Grade band rows */}
        {BANDS.map((band) => (
          <div key={band} className="mb-6">
            <h3 className="font-nunito text-base font-bold text-text-dark dark:text-gray-100 mb-2 px-1">
              {BAND_LABELS[band]}{" "}
              <span className="font-sarabun text-sm text-text-mid dark:text-gray-400 font-normal">
                {BAND_LABELS_TH[band]}
              </span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SECTIONS.map((section) => {
                const key = `${section}_${band}`;
                const quiz = quizLookup[key];
                if (!quiz) return <div key={key} />;

                const best = bestAttempts[quiz.id];
                const pct = best
                  ? Math.round(
                      (best.points_earned / best.points_possible) * 100
                    )
                  : null;
                const meta = SECTION_META[section];

                return (
                  <Link
                    key={key}
                    href={`/learn/practice/${section}/${band}`}
                    className="group relative flex flex-col rounded-2xl bg-white dark:bg-gray-800
                               p-4 shadow-sm transition-all duration-200
                               hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderBottom: `4px solid ${meta.color}` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{meta.emoji}</span>
                      <span
                        className="font-nunito text-sm font-bold"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <span className="font-nunito text-xs text-text-mid dark:text-gray-400">
                      15 questions
                    </span>

                    {best ? (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-nunito text-text-mid dark:text-gray-400">
                            Best
                          </span>
                          <span
                            className={`font-nunito font-bold ${
                              pct! >= 80
                                ? "text-leaf-dark dark:text-leaf"
                                : pct! >= 60
                                  ? "text-sun-dark dark:text-sun"
                                  : "text-coral-dark dark:text-coral"
                            }`}
                          >
                            {best.points_earned}/{best.points_possible}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mt-1">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: meta.color,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="font-nunito text-xs text-text-light dark:text-gray-500">
                          Not attempted
                        </span>
                      </div>
                    )}

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="absolute top-3 right-3 text-text-light dark:text-gray-600"
                    >
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/learn"
          className="font-nunito text-sm text-text-mid dark:text-gray-400 hover:text-text-dark dark:hover:text-gray-200"
        >
          Back to subjects
        </Link>
      </div>
    </section>
  );
}
