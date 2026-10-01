"use client";

import { useMemo } from "react";
import type { FlagLevel } from "@/lib/game/rules";

/** Total time the fanfare runs before Ollie takes off (a tap skips it). */
export const CELEBRATE_MS = 3500;
export const CELEBRATE_REDUCED_MS = 2200;

const FLAG_COLORS: Record<FlagLevel, [string, string]> = {
  bronze: ["#B8692B", "#E8A468"],
  silver: ["#9AA8B4", "#EEF3F7"],
  gold: ["#F2A900", "#FFE680"],
};
const SPARK = ["#FFD54F", "#FF8A65", "#4FC3F7", "#BA68C8", "#81C784", "#FFFFFF", "#F06292"];

export function CelebrationStyles() {
  return (
    <style>{`
      @keyframes eas-flag-rise { from { top: 13%; opacity: 1 } to { top: 3.5%; opacity: 1 } }
      @keyframes eas-flag-out { to { opacity: 0 } }
      @keyframes eas-fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes eas-burst {
        0% { transform: translate(0,0) scale(.4); opacity: 0 }
        10% { opacity: 1 }
        70% { opacity: 1 }
        100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0 }
      }
      @keyframes eas-pop { 0% { transform: scale(.2) rotate(-6deg); opacity: 0 } 60% { transform: scale(1.12) rotate(2deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
      @keyframes eas-shimmer { to { background-position: 200% center } }
      @keyframes eas-twinkle { 0%,100% { transform: scale(.4) rotate(0); opacity: .2 } 50% { transform: scale(1.2) rotate(30deg); opacity: 1 } }
      @keyframes eas-glow { 0%,100% { filter: drop-shadow(0 0 0 rgba(255,215,0,0)) } 50% { filter: drop-shadow(0 0 14px rgba(255,215,0,.95)) } }
      @media (prefers-reduced-motion: reduce) { .eas-anim { animation: none !important } }
    `}</style>
  );
}

/** A coloured pennant that climbs the pole, drawn over the open castle. */
export function RisingFlag({ flag }: { flag: FlagLevel }) {
  const [a, b] = FLAG_COLORS[flag];
  return (
    <span
      className="eas-anim pointer-events-none absolute"
      style={{
        left: "50.5%", width: "30%", height: "9.5%", top: "13%",
        background: `linear-gradient(135deg, ${b}, ${a})`,
        clipPath: "polygon(0 0, 100% 8%, 82% 50%, 100% 92%, 0 100%)",
        animation: "eas-flag-rise 1.1s cubic-bezier(.2,.8,.3,1) .15s both, eas-flag-out .3s ease 1.55s forwards",
      }}
    />
  );
}

/** Fireworks / confetti around the castle. More, bigger and goldier for a gold flag. */
export function CastleFireworks({ flag }: { flag: FlagLevel }) {
  const bursts = useMemo(() => {
    const gold = flag === "gold";
    const centres = [
      { x: 52, y: -4, t: 1.0 }, { x: 8, y: 14, t: 1.35 }, { x: 94, y: 10, t: 1.7 },
      ...(gold ? [{ x: 30, y: -12, t: 2.0 }, { x: 76, y: -14, t: 2.25 }, { x: 50, y: 30, t: 2.5 }] : []),
    ];
    return centres.map((c, bi) => ({
      ...c,
      parts: Array.from({ length: gold ? 26 : 18 }).map((_, i, arr) => {
        const ang = (i / arr.length) * Math.PI * 2 + bi;
        const r = (gold ? 80 : 60) + Math.random() * (gold ? 70 : 50);
        return { dx: Math.cos(ang) * r, dy: Math.sin(ang) * r, color: gold && i % 2 ? "#FFD54F" : SPARK[(i + bi) % SPARK.length], size: 7 + Math.random() * 7 };
      }),
    }));
  }, [flag]);

  return (
    <span className="pointer-events-none absolute inset-0 z-10">
      {bursts.map((b, bi) =>
        b.parts.map((p, i) => (
          <span
            key={`${bi}-${i}`}
            className="eas-anim absolute rounded-full"
            style={{
              left: `${b.x}%`, top: `${b.y}%`, width: p.size, height: p.size, background: p.color,
              boxShadow: `0 0 8px ${p.color}`, opacity: 0,
              ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`,
              animation: `eas-burst 1.1s ease-out ${b.t}s both`,
            }}
          />
        ))
      )}
    </span>
  );
}

/** Sparkly text, fixed to the viewport so it is visible wherever a phone has scrolled the map. */
export function CelebrationBanner({ flag, onSkip }: { flag: FlagLevel; onSkip: () => void }) {
  const gold = flag === "gold";
  const grad = gold
    ? "linear-gradient(90deg,#F2A900,#FFF3B0,#F2A900,#FFF3B0)"
    : "linear-gradient(90deg,#FF8A65,#FFD54F,#4FC3F7,#BA68C8,#FF8A65)";
  return (
    <button
      type="button" onClick={onSkip} aria-label="Skip celebration"
      className="fixed inset-0 z-[5000] flex cursor-pointer items-start justify-center bg-transparent px-4 pt-[18vh]"
    >
      <span className="eas-anim relative block text-center" style={{ animation: "eas-pop .55s cubic-bezier(.2,1.4,.4,1) 1.2s both" }}>
        <span aria-hidden className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[50%]" style={{ background: "radial-gradient(closest-side, rgba(20,30,60,.55), rgba(20,30,60,0))" }} />
        {["-left-6 -top-4", "-right-5 -top-6", "left-2 -bottom-5", "right-3 -bottom-4"].map((pos, i) => (
          <span key={i} className={`eas-anim absolute ${pos} text-2xl`} style={{ animation: `eas-twinkle 1.2s ease-in-out ${1.4 + i * 0.25}s infinite` }}>✨</span>
        ))}
        {gold && (
          <span className="eas-anim block font-fredoka text-2xl font-bold text-amber-500" style={{ animation: "eas-glow 1s ease-in-out infinite" }}>
            ⭐ PERFECT! ⭐
          </span>
        )}
        <span
          className="eas-anim block font-fredoka text-4xl font-extrabold leading-tight sm:text-5xl"
          style={{
            backgroundImage: grad, backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text",
            color: "transparent", WebkitTextStroke: "1.5px rgba(255,255,255,.9)", paintOrder: "stroke fill",
            filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))", animation: "eas-shimmer 2.2s linear infinite",
          }}
        >
          Castle conquered!
        </span>
        <span className="mt-1 block font-fredoka text-xl font-semibold text-white" style={{ textShadow: "0 2px 6px rgba(0,0,0,.6)" }}>
          On to the next castle! →
        </span>
        <span className="block font-sarabun text-lg font-semibold text-white" style={{ textShadow: "0 2px 6px rgba(0,0,0,.6)" }}>
          พิชิตปราสาทแล้ว! ไปปราสาทต่อไปกันเถอะ
        </span>
        <span className="mt-2 block font-nunito text-xs font-bold text-white/80">tap to skip</span>
      </span>
    </button>
  );
}
