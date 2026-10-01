import Link from "next/link";
import { PASS_DENOMINATOR, PASS_NUMERATOR, quizPassed } from "@/lib/game/rules";
import type { Castle } from "@/lib/game/rules";
import { mapHref } from "@/lib/game/context";

export type StepKey = "flashcards" | "storybook" | "quiz";
export const STEP_INFO: Record<StepKey | "picture", { en: string; th: string; icon: string; path: string; verb: string; verbTh: string }> = {
  flashcards: { en: "Flashcards", th: "บัตรคำ", icon: "🃏", path: "flashcards", verb: "Learn the words!", verbTh: "เรียนคำศัพท์!" },
  storybook: { en: "Storybook", th: "นิทาน", icon: "📖", path: "ebook", verb: "Read the story!", verbTh: "อ่านนิทาน!" },
  quiz: { en: "Quiz", th: "แบบทดสอบ", icon: "✏️", path: "quiz", verb: "Win the castle!", verbTh: "พิชิตปราสาท!" },
  picture: { en: "Picture Quiz", th: "ทายภาพ", icon: "🖼️", path: "picture-quiz", verb: "Bonus fun!", verbTh: "โบนัสสนุกๆ!" },
};
const SPRITE = { locked: "castle-locked", current: "castle-open", bronze: "castle-bronze", silver: "castle-silver", gold: "castle-gold" } as const;

export interface CastleScreenProps {
  slug: string; band: string; emoji: string; titleEn: string; titleTh: string;
  castle: Pick<Castle, "status" | "flag" | "steps" | "bestScore" | "bestTotal">;
  hasPicture: boolean;
}

/** Presentational castle screen (Phase 3); the route fetches the data, this draws it. */
export function CastleScreen({ slug, band, emoji, titleEn, titleTh, castle, hasPicture }: CastleScreenProps) {
  const subject = { grade_band: band, emoji, title_en: titleEn, title_th: titleTh };
  const steps = castle.steps.map((s) => ({ ...s, ...STEP_INFO[s.key] }));
  const firstTodo = steps.findIndex((s) => !s.done);
  const complete = castle.status === "complete";
  const quizDone = steps.find((s) => s.key === "quiz")?.done ?? false;
  const failedQuiz = !quizDone && castle.bestScore !== null && !quizPassed(castle.bestScore, castle.bestTotal);
  const spriteName = complete ? SPRITE[castle.flag ?? "bronze"] : SPRITE.current;
  const doneCount = steps.filter((s) => s.done).length;
  const current = firstTodo >= 0 ? steps[firstTodo] : null;
  const picture = STEP_INFO.picture;

  return (
    <section className="mx-auto max-w-md pb-10">
      <Link href={mapHref(subject.grade_band)} className="inline-flex min-h-[44px] items-center rounded-full bg-sky-dark px-4 font-nunito text-sm font-bold text-white shadow">
        ← Back to Map <span className="font-sarabun ml-1">แผนที่</span>
      </Link>

      {/* Castle + Ollie guide */}
      <div className="mt-4 rounded-3xl bg-gradient-to-b from-sky-100 to-green-100 p-5 text-center shadow-lg dark:from-gray-800 dark:to-gray-800">
        <div className="relative mx-auto h-40 w-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/game/${spriteName}.webp`} alt="" className="mx-auto h-40 w-auto object-contain drop-shadow-lg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/game/ollie-stand.webp" alt="Ollie" className="absolute -left-14 bottom-0 h-24 w-auto drop-shadow-lg" />
        </div>
        <h1 className="mt-3 font-nunito text-2xl font-extrabold text-text-dark dark:text-gray-100">
          {subject.emoji} {subject.title_en}
        </h1>
        <p className="font-sarabun text-base text-text-mid dark:text-gray-400">{subject.title_th}</p>

        <div className="mt-3 inline-block max-w-xs rounded-2xl bg-white px-4 py-2 text-left shadow dark:bg-gray-700">
          {complete ? (
            <>
              <p className="font-nunito text-sm font-bold text-text-dark dark:text-gray-100">
                🚩 You won this castle{castle.flag ? ` with a ${castle.flag} flag` : ""}! Replay any step you like.
              </p>
              <p className="font-sarabun text-xs text-text-mid dark:text-gray-300">ชนะปราสาทนี้แล้ว! เล่นซ้ำขั้นไหนก็ได้</p>
            </>
          ) : current ? (
            <>
              <p className="font-nunito text-sm font-bold text-text-dark dark:text-gray-100">Step {steps.indexOf(current) + 1} of {steps.length}: {current.verb}</p>
              <p className="font-sarabun text-xs text-text-mid dark:text-gray-300">ขั้นที่ {steps.indexOf(current) + 1} จาก {steps.length}: {current.verbTh}</p>
            </>
          ) : null}
        </div>

        {/* progress dots */}
        <div className="mt-3 flex justify-center gap-2" aria-label={`${doneCount} of ${steps.length} steps done`}>
          {steps.map((s, i) => (
            <span key={s.key} className={`h-3.5 w-3.5 rounded-full ring-2 ring-white ${s.done ? "bg-green-500" : i === firstTodo ? "bg-amber-400" : "bg-gray-300"}`} />
          ))}
        </div>
      </div>

      {/* Steps */}
      <ol className="mt-5 space-y-3">
        {steps.map((s, i) => {
          const isCurrent = i === firstTodo;
          const waiting = !s.done && !isCurrent;
          const href = `/learn/${slug}/${s.path}`;
          return (
            <li key={s.key} className={`rounded-2xl p-4 shadow-md ${isCurrent ? "bg-yellow-50 ring-4 ring-amber-300 dark:bg-gray-800" : "bg-white dark:bg-gray-800"} ${waiting ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl ${s.done ? "bg-green-500 text-white" : "bg-sky-100"}`}>
                  {s.done ? "✓" : s.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-nunito text-base font-extrabold text-text-dark dark:text-gray-100">{i + 1}. {s.en}</p>
                  <p className="font-sarabun text-sm text-text-mid dark:text-gray-400">{s.th}</p>
                  {s.key === "quiz" && castle.bestScore !== null && (
                    <p className="font-nunito text-xs font-semibold text-text-mid dark:text-gray-400">Best: {castle.bestScore}/{castle.bestTotal ?? 10}</p>
                  )}
                </div>
                {s.done && (
                  <Link href={href} className="flex min-h-[48px] items-center rounded-xl bg-gray-100 px-4 font-nunito text-sm font-bold text-text-dark active:scale-95 dark:bg-gray-700 dark:text-gray-100">
                    Replay <span className="font-sarabun ml-1">เล่นอีก</span>
                  </Link>
                )}
                {waiting && <span className="text-2xl" aria-label="Locked until the step before is done">🔒</span>}
              </div>

              {isCurrent && (
                <>
                  {s.key === "quiz" && failedQuiz && (
                    <p className="mt-3 rounded-xl bg-orange-50 p-3 font-nunito text-sm font-bold text-orange-700">
                      So close! You need {PASS_NUMERATOR} out of {PASS_DENOMINATOR} to win the castle. You can do it!
                      <span className="block font-sarabun text-xs font-normal">เกือบแล้ว! ต้องได้ {PASS_NUMERATOR} จาก {PASS_DENOMINATOR} เพื่อพิชิตปราสาท สู้ๆ!</span>
                    </p>
                  )}
                  <Link href={href} className="mt-3 flex min-h-[64px] items-center justify-center rounded-2xl bg-leaf px-6 font-nunito text-xl font-extrabold text-white shadow-lg active:scale-95">
                    {s.key === "quiz" && failedQuiz ? "Try again!" : doneCount === 0 ? "Start!" : "Next!"}
                    <span className="font-sarabun ml-2 text-base">{s.key === "quiz" && failedQuiz ? "ลองอีกครั้ง" : doneCount === 0 ? "เริ่ม" : "ต่อไป"}</span>
                  </Link>
                </>
              )}
            </li>
          );
        })}

        {/* Optional bonus: never blocks the flag */}
        {hasPicture && (
          <li className={`rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 p-4 dark:bg-gray-800 ${quizDone || complete ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-200 text-2xl">{picture.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-nunito text-base font-extrabold text-text-dark dark:text-gray-100">⭐ Bonus: {picture.en}</p>
                <p className="font-sarabun text-sm text-text-mid dark:text-gray-400">{picture.th} (ไม่บังคับ)</p>
                <p className="font-nunito text-xs text-purple-700">Just for fun. Not needed for your flag.</p>
              </div>
              {quizDone || complete ? (
                <Link href={`/learn/${slug}/${picture.path}`} className="flex min-h-[48px] items-center rounded-xl bg-purple-500 px-4 font-nunito text-sm font-bold text-white active:scale-95">
                  Play
                </Link>
              ) : <span className="text-2xl">🔒</span>}
            </div>
          </li>
        )}
      </ol>
    </section>
  );
}
