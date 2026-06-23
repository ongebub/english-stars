import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODULE_LABELS: Record<string, { en: string; th: string }> = {
  "1": { en: "Module 1: PreK – 1st Grade", th: "โมดูล 1" },
  "2": { en: "Module 2: 1st – 2nd Grade", th: "โมดูล 2" },
};

const CARD_COLORS = [
  "bg-sun/30 hover:bg-sun/50",
  "bg-leaf/20 hover:bg-leaf/40",
  "bg-coral/20 hover:bg-coral/40",
  "bg-purple/20 hover:bg-purple/40",
  "bg-sky/20 hover:bg-sky/40",
];

export default async function LearnPage() {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .eq("is_published", true)
    .order("module")
    .order("sort_order");

  /* Group subjects by module */
  const grouped: Record<string, Subject[]> = {};
  for (const s of (subjects ?? []) as Subject[]) {
    const key = s.module;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  return (
    <section>
      <h1 className="font-nunito text-center text-3xl font-extrabold text-text-dark">
        Choose a Subject
      </h1>
      <p className="font-sarabun mt-1 text-center text-lg text-text-mid">
        เลือกวิชาที่จะเรียน
      </p>

      {Object.entries(grouped).map(([mod, items]) => {
        const label = MODULE_LABELS[mod] ?? { en: `Module ${mod}`, th: `โมดูล ${mod}` };

        return (
          <div key={mod} className="mt-8">
            {/* Module header */}
            <h2 className="font-nunito text-xl font-bold text-text-dark">
              {label.en}
            </h2>
            <p className="font-sarabun text-sm text-text-mid">{label.th}</p>

            {/* Subject grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map((subject, idx) => {
                const isFirst = mod === "1" && idx === 0;
                const colorClass = CARD_COLORS[idx % CARD_COLORS.length];

                return (
                  <Link
                    key={subject.id}
                    href={`/learn/${subject.slug}`}
                    className={`relative flex min-h-[140px] flex-col items-center justify-center rounded-xl p-4 shadow-md transition-shadow hover:shadow-lg ${colorClass}`}
                  >
                    {/* Free badge or lock icon */}
                    {isFirst ? (
                      <span className="absolute right-2 top-2 rounded-full bg-leaf px-2 py-0.5 text-xs font-bold text-white">
                        Free &middot;{" "}
                        <span className="font-sarabun">ฟรี</span>
                      </span>
                    ) : (
                      <span className="absolute right-2 top-2 text-text-light">
                        🔒
                      </span>
                    )}

                    <span className="text-5xl">{subject.emoji}</span>
                    <span className="font-nunito mt-2 text-center text-base font-bold text-text-dark">
                      {subject.title_en}
                    </span>
                    <span className="font-sarabun text-center text-sm text-text-mid">
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
