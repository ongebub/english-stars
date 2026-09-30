import Link from "next/link";
import Image from "next/image";
import type { Castle, FlagLevel } from "@/lib/game/rules";

const FLAG_STYLE: Record<FlagLevel, { bg: string; label: string }> = {
  bronze: { bg: "#CD7F32", label: "Bronze flag" },
  silver: { bg: "#B0BEC5", label: "Silver flag" },
  gold:   { bg: "#FFC107", label: "Gold flag" },
};
const STEP_LABEL = { flashcards: "Cards", storybook: "Story", quiz: "Quiz" } as const;

/** Placeholder castle: emoji + CSS. Real art replaces this in Phase 5. */
export function CastleNode({ castle, align, number }: { castle: Castle; align: "left" | "center" | "right"; number: number }) {
  const { status, paywalled } = castle;
  const href = paywalled ? "/subscribe" : status === "locked" ? null : `/learn/${castle.slug}`;
  const justify = align === "left" ? "sm:justify-start" : align === "right" ? "sm:justify-end" : "sm:justify-center";

  const body = (
    <div
      className={`relative flex w-64 flex-col items-center rounded-2xl p-4 text-center shadow-md transition
        ${status === "complete" ? "bg-green-50 dark:bg-green-900/30 ring-2 ring-green-500" : ""}
        ${status === "current" ? "bg-yellow-50 dark:bg-yellow-900/30 ring-4 ring-sky-dark" : ""}
        ${status === "locked" ? "bg-gray-100 dark:bg-gray-800 opacity-70" : "bg-white dark:bg-gray-800"}
        ${href ? "hover:-translate-y-1 hover:shadow-lg" : ""}`}
      aria-label={`${castle.title_en}: ${status}${paywalled ? ", subscription needed" : ""}`}
    >
      <span className="absolute left-2 top-2 rounded-full bg-sky-dark px-2 text-xs font-bold text-white">{number}</span>

      <div className="relative">
        <span className={`block text-6xl leading-none ${status === "locked" ? "grayscale" : ""}`}>🏰</span>
        {status === "complete" && castle.flag && (
          <span
            className="absolute -right-5 -top-3 flex h-7 items-center rounded-r-md px-1.5 text-sm shadow"
            style={{ background: FLAG_STYLE[castle.flag].bg }}
            title={FLAG_STYLE[castle.flag].label}
          >🚩</span>
        )}
        {status === "locked" && <span className="absolute -bottom-1 -right-3 text-2xl">🔒</span>}
        {status === "current" && (
          <Image
            src="/tutorial/ollie-wave.png" alt="Ollie (placeholder pose)" width={56} height={56}
            className="absolute -left-14 bottom-0 h-14 w-14 object-contain"
          />
        )}
      </div>

      <span className="mt-2 text-2xl">{castle.emoji}</span>
      <span className="font-nunito text-base font-bold text-text-dark dark:text-gray-100">{castle.title_en}</span>
      <span className="font-sarabun text-sm text-text-mid dark:text-gray-400">{castle.title_th}</span>

      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {castle.steps.map((s) => (
          <span
            key={s.key}
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}
          >{s.done ? "✓ " : ""}{STEP_LABEL[s.key]}</span>
        ))}
      </div>

      <span className="mt-2 text-xs font-bold uppercase tracking-wide text-text-mid dark:text-gray-400">
        {status === "complete" ? "Flag raised" : status === "current" ? (paywalled ? "Subscribe to continue" : "You are here") : "Locked"}
      </span>
    </div>
  );

  return (
    <div className={`flex justify-center ${justify}`}>
      {href ? <Link href={href} aria-label={`Open ${castle.title_en}`}>{body}</Link> : body}
    </div>
  );
}
