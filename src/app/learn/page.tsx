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

export default async function LearnPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check subscription status
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

  /* Group subjects by module */
  const grouped: Record<string, Subject[]> = {};
  for (const s of (subjects ?? []) as Subject[]) {
    const key = String(s.module);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  /* Global card index for ribbon color cycling */
  let cardIndex = 0;

  return (
    <section>
      <h1 className="font-nunito text-center text-3xl font-extrabold text-text-dark">
        Choose a Subject
      </h1>
      <p className="font-sarabun mt-1 text-center text-lg text-text-mid">
        เลือกวิชาที่จะเรียน
      </p>

      {Object.entries(grouped).map(([mod, items]) => {
        const label = MODULE_LABELS[mod] ?? {
          en: `Module ${mod}`,
          th: `โมดูล ${mod}`,
        };

        return (
          <div key={mod} className="mt-8">
            {/* Module header */}
            <h2 className="font-nunito text-xl font-bold text-text-dark">
              {label.en}
            </h2>
            <p className="font-sarabun text-sm text-text-mid">{label.th}</p>

            {/* Subject grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map((subject) => {
                const isFree = subject.slug === FREE_SLUG;
                const isLocked = !isSubscribed && !isFree;
                const color = RIBBON_COLORS[cardIndex % RIBBON_COLORS.length];
                cardIndex++;

                const href = isLocked
                  ? "/subscribe"
                  : `/learn/${subject.slug}`;

                return (
                  <Link
                    key={subject.id}
                    href={href}
                    className="group relative flex min-h-[140px] flex-col items-center justify-center rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderBottom: `4px solid ${color}` }}
                  >
                    {/* Free badge or lock icon */}
                    {isFree ? (
                      <span className="absolute right-2 top-2 rounded-full bg-leaf px-2 py-0.5 text-xs font-bold text-white">
                        Free &middot;{" "}
                        <span className="font-sarabun">ฟรี</span>
                      </span>
                    ) : isLocked ? (
                      <span className="absolute right-2 top-2 text-text-light">
                        🔒
                      </span>
                    ) : null}

                    {/* Dimmed overlay for locked cards */}
                    {isLocked && (
                      <span className="absolute inset-0 rounded-xl bg-gray-100/50 pointer-events-none" />
                    )}

                    <span className={`text-5xl ${isLocked ? "opacity-50 grayscale" : ""}`}>
                      {subject.emoji}
                    </span>
                    <span
                      className={`font-nunito mt-2 text-center text-base font-bold ${
                        isLocked ? "text-text-light" : "text-text-dark"
                      }`}
                    >
                      {subject.title_en}
                    </span>
                    <span
                      className={`font-sarabun text-center text-sm ${
                        isLocked ? "text-text-light" : "text-text-mid"
                      }`}
                    >
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
