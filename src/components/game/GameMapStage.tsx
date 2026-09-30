"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Castle } from "@/lib/game/rules";
import {
  MAP_ASPECT, MAP_MIN_WIDTH_PX, MAP_SPOTS, OLLIE_FLY_FRAMES, OLLIE_HOP, OLLIE_STAND,
  OLLIE_WALKSIDE_FRAMES, OLLIE_WAVE, mapFallback, mapSrcSet,
} from "@/lib/game/map-config";
import type { MapBand } from "@/lib/game/rules";

const OLLIE_W = 5.6; // % of map width

export interface StageCastle extends Pick<Castle, "id" | "slug" | "title_en" | "title_th" | "status" | "flag" | "paywalled" | "steps"> {
  number: number;
}

function sprite(c: StageCastle): string {
  if (c.status === "locked") return "/game/castle-locked.webp";
  if (c.status === "current") return "/game/castle-open.webp";
  return `/game/castle-${c.flag ?? "bronze"}.webp`;
}

/**
 * The landscape with castles on its clearings and Ollie at the current castle.
 * On a phone in portrait the map keeps a minimum width and scrolls sideways
 * (a 16:9 picture shrunk to 375px would make castles ~40px, too small to tap);
 * it opens scrolled to Ollie. On wider screens it simply fills the column.
 */
export function GameMapStage({
  band, castles, storageKey, allDone,
}: { band: MapBand; castles: StageCastle[]; storageKey: string; allDone: boolean }) {
  const spots = MAP_SPOTS[band];
  const scroller = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const curIdx = castles.findIndex((c) => c.status === "current");
  // Where Ollie stands: current castle, or the last one once everything is flagged.
  const homeIdx = curIdx >= 0 ? curIdx : allDone ? castles.length - 1 : -1;

  const home = (i: number) => {
    const s = spots[i];
    return { x: s.x - s.w * 0.52, y: s.y + 3.5 };
  };
  const [pos, setPos] = useState<{ x: number; y: number } | null>(homeIdx >= 0 ? home(homeIdx) : null);
  const [hop, setHop] = useState(0);            // px lift while moving
  const [frame, setFrame] = useState(0);
  const [moving, setMoving] = useState<null | { flip: boolean }>(null);
  const flyFrames = OLLIE_FLY_FRAMES;

  const centreOn = (xPct: number, smooth = false) => {
    const sc = scroller.current, st = stage.current;
    if (!sc || !st) return;
    sc.scrollTo({ left: Math.max(0, (xPct / 100) * st.clientWidth - sc.clientWidth / 2), behavior: smooth ? "smooth" : "auto" });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (homeIdx >= 0) centreOn(home(homeIdx).x); }, [band, homeIdx]);

  // First view after a castle was completed: Ollie travels from where he was last seen.
  useEffect(() => {
    if (homeIdx < 0) return;
    const slug = castles[homeIdx].slug;
    // Remember where Ollie was last shown. The new spot is written only once he has
    // arrived (or no move is needed), so a cancelled/re-run effect still animates.
    let prevSlug: string | null = null;
    try { prevSlug = localStorage.getItem(storageKey); } catch { /* private mode */ }
    const remember = () => { try { localStorage.setItem(storageKey, slug); } catch { /* private mode */ } };
    const prevIdx = prevSlug ? castles.findIndex((c) => c.slug === prevSlug) : -1;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prevIdx < 0 || prevIdx === homeIdx || reduce) { remember(); setPos(home(homeIdx)); return; }

    const from = home(prevIdx), to = home(homeIdx);
    setPos(from); centreOn(from.x);
    const DURATION = 1800;
    let raf = 0, t0 = 0;
    const flying = flyFrames.length > 0;
    setMoving({ flip: to.x < from.x });
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / DURATION);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      setPos({ x, y });
      // flying: one smooth arc; hopping: four bounces
      setHop(flying ? Math.sin(Math.PI * p) * 40 : Math.abs(Math.sin(p * Math.PI * 4)) * 22);
      setFrame(Math.floor(((t - t0) / 90) % Math.max(1, flyFrames.length)));
      centreOn(x);
      if (p < 1) raf = requestAnimationFrame(step);
      else { setHop(0); setMoving(null); remember(); }
    };
    const delay = window.setTimeout(() => { raf = requestAnimationFrame(step); }, 500);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, homeIdx, storageKey]);

  const ollieSrc = moving
    ? (flyFrames.length ? flyFrames[frame % flyFrames.length]
      : OLLIE_WALKSIDE_FRAMES.length ? OLLIE_WALKSIDE_FRAMES[frame % OLLIE_WALKSIDE_FRAMES.length] : OLLIE_HOP)
    : allDone && curIdx < 0 ? OLLIE_WAVE : OLLIE_STAND;

  return (
    <div ref={scroller} className="overflow-x-auto overflow-y-hidden rounded-2xl shadow-lg" style={{ scrollbarWidth: "thin" }}>
      <div
        ref={stage}
        className="relative"
        style={{ aspectRatio: String(MAP_ASPECT), minWidth: `${MAP_MIN_WIDTH_PX}px`, width: "100%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mapFallback(band)} srcSet={mapSrcSet(band)} sizes={`(max-width: 900px) ${MAP_MIN_WIDTH_PX}px, 900px`}
          alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover"
        />

        <ol className="absolute inset-0 m-0 list-none p-0">
          {castles.map((c, i) => {
            const s = spots[i];
            const href = c.paywalled ? "/subscribe" : c.status === "locked" ? null : `/learn/${c.slug}`;
            const inner = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sprite(c)} alt="" draggable={false} className={`block w-full select-none ${c.status === "locked" ? "opacity-95" : ""}`} />
                <span className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center whitespace-nowrap ${s.labelTop ? "bottom-full -mb-[4%]" : "top-full -mt-[6%]"}`}>
                  <span className="rounded-full bg-white/95 px-2.5 py-0.5 font-nunito text-[11px] font-extrabold leading-tight text-text-dark shadow sm:text-xs">
                    <span className="mr-1 text-sky-dark">{c.number}</span>{c.title_en}
                  </span>
                  {c.status === "current" && c.paywalled && (
                    <span className="mt-0.5 rounded-full bg-amber-400 px-2 py-0.5 font-nunito text-[10px] font-extrabold text-text-dark shadow">Subscribe to play</span>
                  )}
                  {c.status !== "locked" && !c.paywalled && (
                    <span className="mt-0.5 flex gap-1" aria-hidden>
                      {c.steps.map((st) => (
                        <span key={st.key} className={`h-2 w-2 rounded-full ring-1 ring-white ${st.done ? "bg-green-500" : "bg-gray-300"}`} />
                      ))}
                    </span>
                  )}
                </span>
              </>
            );
            const box = {
              left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, minWidth: 72,
              transform: "translate(-50%, -84%)", zIndex: Math.round(s.y * 10),
            } as const;
            return (
              <li key={c.id} className="absolute" style={box}>
                {href ? (
                  <Link href={href} className="relative block rounded-xl outline-none transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-sky-dark active:scale-95"
                    aria-label={`${c.title_en}, castle ${c.number}: ${c.status}${c.paywalled ? ", subscription needed" : ""}`}>
                    {inner}
                  </Link>
                ) : (
                  <div className="relative" aria-label={`${c.title_en}, castle ${c.number}: locked`}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>

        {pos && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ollieSrc} alt="Ollie the owl" draggable={false}
            className="pointer-events-none absolute select-none drop-shadow-lg"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`, width: `${OLLIE_W}%`, minWidth: 40, zIndex: 2000,
              transform: `translate(-50%, calc(-100% - ${hop}px)) scaleX(${moving?.flip && (flyFrames.length || OLLIE_WALKSIDE_FRAMES.length) ? -1 : 1})`,
            }}
          />
        )}
      </div>
    </div>
  );
}
