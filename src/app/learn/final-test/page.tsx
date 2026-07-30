import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FinalTestListPage() {
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

  // Fetch published final tests
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, paper_number, title_en, title_th, total_points, time_limit_minutes")
    .eq("kind", "final_test")
    .eq("is_published", true)
    .order("paper_number");

  // Fetch user's best attempts for each assessment
  const assessmentIds = (assessments ?? []).map((a) => a.id);
  const { data: attempts } = assessmentIds.length
    ? await supabase
        .from("assessment_attempts")
        .select("assessment_id, points_earned, points_possible, submitted_at")
        .eq("user_id", user.id)
        .in("assessment_id", assessmentIds)
        .not("submitted_at", "is", null)
        .order("points_earned", { ascending: false })
    : { data: [] };

  // Best attempt per assessment
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
        <span className="text-5xl block mb-2">🏆</span>
        <h1 className="font-nunito text-3xl font-extrabold text-text-dark dark:text-gray-100">
          Final Test
        </h1>
        <p className="font-sarabun text-lg text-text-mid dark:text-gray-400 mt-1">
          สอบปลายภาค
        </p>
        <p className="font-nunito text-sm text-text-mid dark:text-gray-400 mt-2 max-w-md mx-auto">
          50 questions &middot; 100 points &middot; 90 minutes &middot; 5 options per question
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {(assessments ?? []).map((assessment) => {
          const best = bestAttempts[assessment.id];
          const pct = best
            ? Math.round((best.points_earned / best.points_possible) * 100)
            : null;

          return (
            <Link
              key={assessment.id}
              href={`/learn/final-test/${assessment.paper_number}`}
              className="group relative flex flex-col rounded-2xl bg-white dark:bg-gray-800
                         p-5 shadow-sm border-b-4 border-[#0288D1]
                         transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📝</span>
                <div className="flex-1 min-w-0">
                  <span className="font-nunito text-lg font-bold text-text-dark dark:text-gray-100 block">
                    Paper {assessment.paper_number}
                  </span>
                  <span className="font-sarabun text-sm text-text-mid dark:text-gray-400 block">
                    ฉบับที่ {assessment.paper_number}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="flex-shrink-0 text-text-light"
                >
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-mid dark:text-gray-400 font-nunito">
                <span>{assessment.total_points} points</span>
                <span>&middot;</span>
                <span>{assessment.time_limit_minutes} min</span>
              </div>

              {best && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-nunito text-text-mid dark:text-gray-400">
                      Best score
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
                      {best.points_earned}/{best.points_possible} ({pct}%)
                    </span>
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Scoring breakdown info */}
      <div className="mt-8 max-w-2xl mx-auto rounded-2xl bg-cream dark:bg-gray-800 p-5">
        <h2 className="font-nunito text-lg font-bold text-text-dark dark:text-gray-100 mb-3">
          Scoring Breakdown
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm font-nunito">
          <div className="text-text-mid dark:text-gray-400">
            Part I: Expression (1-10)
          </div>
          <div className="text-text-dark dark:text-gray-200 text-right">
            16 points
          </div>
          <div className="text-text-mid dark:text-gray-400">
            Part II: Reading (11-25)
          </div>
          <div className="text-text-dark dark:text-gray-200 text-right">
            36 points
          </div>
          <div className="text-text-mid dark:text-gray-400">
            Part III: Structure (26-40)
          </div>
          <div className="text-text-dark dark:text-gray-200 text-right">
            33 points
          </div>
          <div className="text-text-mid dark:text-gray-400">
            Part IV: Vocabulary (41-50)
          </div>
          <div className="text-text-dark dark:text-gray-200 text-right">
            15 points
          </div>
          <div className="text-text-dark dark:text-gray-100 font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
            Total
          </div>
          <div className="text-text-dark dark:text-gray-100 font-bold text-right border-t border-gray-200 dark:border-gray-600 pt-2">
            100 points
          </div>
        </div>
      </div>
    </section>
  );
}
