"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Castle } from "@/lib/game/rules";
import {
  FLY_FRAME_MS, LANDING_MS, MAP_ASPECT, MAP_MIN_WIDTH_PX, MAP_SPOTS, OLLIE_FLY_FRAMES, OLLIE_LANDING,
  OLLIE_SIDE_REL_SCALE, OLLIE_STAND, OLLIE_TAKEOFF, OLLIE_WALKSIDE_FRAMES, OLLIE_WAVE, TAKEOFF_MS,
  WALK_FRAME_MS, WALK_MAX_DIST, mapFallback, mapSrcSet, type OllieFrame,
} from "@/lib/game/map-config";
import type { MapBand } from "@/lib/game/rules";
import {
  CELEBRATE_MS, CELEBRATE_REDUCED_MS, CastleFireworks, CelebrationBanner, CelebrationStyles, RisingFlag,
} from "@/components/game/Celebration";

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
  band, castles, storageKey, allDone, replay = false,
}: { band: MapBand; castles: StageCastle[]; storageKey: string; allDone: boolean; replay?: boolean }) {
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
  // While travelling, Ollie is drawn from these pixel values instead of the idle sprite.
  const [motion, setMotion] = useState<null | { f: OllieFrame; left: number; top: number; k: number; flip: boolean; bob: number }>(null);

  // Fanfare on the castle just completed, before Ollie leaves it.
  const [cel, setCel] = useState<null | { idx: number; reduced: boolean }>(null);
  const skipRef = useRef<(() => void) | null>(null);

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
    let prevIdx = prevSlug ? castles.findIndex((c) => c.slug === prevSlug) : -1;
    // ?replay=1 re-runs the fanfare for the castle before the current one. Cosmetic only
    // (it just changes this browser's "last seen" marker), and off on the live domain.
    if (replay && !/(^|\.)englishallstars\.com$/i.test(window.location.hostname) && homeIdx > 0) prevIdx = homeIdx - 1;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const st = stage.current;
    const celebrated = prevIdx >= 0 && castles[prevIdx].status === "complete";
    if (prevIdx < 0 || prevIdx === homeIdx || !st) { remember(); setPos(home(homeIdx)); return; }
    if (reduce) {
      // No motion: show the finished state and the words briefly, then Ollie simply appears.
      if (!celebrated) { remember(); setPos(home(homeIdx)); return; }
      setPos(home(prevIdx)); centreOn(home(prevIdx).x);
      setCel({ idx: prevIdx, reduced: true });
      const t = window.setTimeout(() => { setCel(null); setPos(home(homeIdx)); centreOn(home(homeIdx).x); remember(); }, CELEBRATE_REDUCED_MS);
      skipRef.current = () => { clearTimeout(t); setCel(null); setPos(home(homeIdx)); centreOn(home(homeIdx).x); remember(); };
      return () => { clearTimeout(t); skipRef.current = null; };
    }

    const W = st.clientWidth, H = st.clientHeight;
    const from = home(prevIdx), to = home(homeIdx);
    const G0 = { x: (from.x / 100) * W, y: (from.y / 100) * H };
    const G1 = { x: (to.x / 100) * W, y: (to.y / 100) * H };
    const dist = Math.hypot(G1.x - G0.x, G1.y - G0.y);
    const flip = G1.x < G0.x;
    const k = ((W * OLLIE_W) / 100 / 320) * OLLIE_SIDE_REL_SCALE; // px per WebP pixel
    const walking = dist < WALK_MAX_DIST * W;
    const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    // Frame placement: put the frame's cap centre at (capX, capY).
    const byCap = (f: OllieFrame, capX: number, capY: number, bob = 0) =>
      setMotion({ f, left: capX - f.cx * k, top: capY - f.cy * k - bob, k, flip, bob });
    // Grounded frames: cap sits above the ground point by (feet - cy).
    const capAbove = (f: OllieFrame, g: { x: number; y: number }) => ({ x: g.x, y: g.y - (f.feet - f.cy) * k });

    const flyMs = Math.min(2400, 1300 + dist * 1.1);
    const walkMs = Math.max(900, dist * 6);
    const total = walking ? walkMs : TAKEOFF_MS + flyMs + LANDING_MS;
    const capStart = capAbove(OLLIE_TAKEOFF, G0), capEnd = capAbove(OLLIE_LANDING, G1);

    let raf = 0, t0 = 0, cancelled = false;
    const tick = (t: number) => {
      if (cancelled) return;
      if (!t0) t0 = t;
      const el = t - t0;
      if (el >= total) { setMotion(null); setPos(to); remember(); return; }
      if (walking) {
        const p = el / walkMs, e = ease(p);
        const fi = Math.floor(el / WALK_FRAME_MS) % OLLIE_WALKSIDE_FRAMES.length;
        const f = OLLIE_WALKSIDE_FRAMES[fi];
        const g = { x: G0.x + (G1.x - G0.x) * e, y: G0.y + (G1.y - G0.y) * e };
        const cap = capAbove(f, g);
        byCap(f, cap.x, cap.y, fi % 2 === 1 ? 3 : 0); // small bob on frames 2 and 4
        centreOn((g.x / W) * 100);
      } else if (el < TAKEOFF_MS) {
        byCap(OLLIE_TAKEOFF, capStart.x, capStart.y);
      } else if (el < TAKEOFF_MS + flyMs) {
        const p = (el - TAKEOFF_MS) / flyMs, e = ease(p);
        const f = OLLIE_FLY_FRAMES[Math.floor((el - TAKEOFF_MS) / FLY_FRAME_MS) % OLLIE_FLY_FRAMES.length];
        const x = capStart.x + (capEnd.x - capStart.x) * e;
        const y = capStart.y + (capEnd.y - capStart.y) * e - Math.sin(Math.PI * p) * (0.06 * W + dist * 0.12);
        byCap(f, x, y);
        centreOn((x / W) * 100);
      } else {
        byCap(OLLIE_LANDING, capEnd.x, capEnd.y);
        centreOn(to.x);
      }
      raf = requestAnimationFrame(tick);
    };
    // Preload every frame so nothing pops in mid-flight, then go.
    const frames = [OLLIE_TAKEOFF, OLLIE_LANDING, ...OLLIE_FLY_FRAMES, ...OLLIE_WALKSIDE_FRAMES];
    let started = false;
    const go = () => {
      if (started || cancelled) return;
      started = true;
      setPos(from); centreOn(from.x);
      const fly = () => { setCel(null); skipRef.current = null; window.setTimeout(() => { if (!cancelled) raf = requestAnimationFrame(tick); }, 450); };
      if (!celebrated) { fly(); return; }
      // Fanfare on the castle just completed, then Ollie takes off. A tap skips it.
      setCel({ idx: prevIdx, reduced: false });
      const t = window.setTimeout(fly, CELEBRATE_MS);
      skipRef.current = () => { clearTimeout(t); fly(); };
    };
    let left = frames.length;
    frames.forEach((fr) => { const im = new window.Image(); im.onload = im.onerror = () => { if (--left === 0) go(); }; im.src = fr.src; });
    const guard = window.setTimeout(go, 2500);
    return () => { cancelled = true; clearTimeout(guard); cancelAnimationFrame(raf); skipRef.current = null; setCel(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, homeIdx, storageKey]);

  const idleSrc = allDone && curIdx < 0 ? OLLIE_WAVE : OLLIE_STAND;

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
            const href = c.paywalled ? "/subscribe" : c.status === "locked" ? null : `/learn/${c.slug}/castle`;
            const celebrating = cel && !cel.reduced && cel.idx === i && c.status === "complete";
            const inner = (
              <>
                {celebrating ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/game/castle-open.webp" alt="" draggable={false} className="block w-full select-none" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sprite(c)} alt="" draggable={false} className="eas-anim absolute inset-0 block w-full select-none"
                      style={{ animation: "eas-fade-in .35s ease 1.3s both" }} />
                    <RisingFlag flag={c.flag ?? "bronze"} />
                    <CastleFireworks flag={c.flag ?? "bronze"} />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sprite(c)} alt="" draggable={false} className={`block w-full select-none ${c.status === "locked" ? "opacity-95" : ""}`} />
                )}
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

        <CelebrationStyles />
        {cel && castles[cel.idx] && (
          <CelebrationBanner flag={castles[cel.idx].flag ?? "bronze"} onSkip={() => skipRef.current?.()} />
        )}
        {pos && !motion && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={idleSrc} alt="Ollie the owl" draggable={false}
            className="pointer-events-none absolute select-none drop-shadow-lg"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${OLLIE_W}%`, minWidth: 40, zIndex: 2000, transform: "translate(-50%, -100%)" }}
          />
        )}
        {motion && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={motion.f.src} alt="Ollie the owl" draggable={false}
            className="pointer-events-none absolute select-none drop-shadow-lg"
            style={{
              left: motion.left, top: motion.top, width: motion.f.w * motion.k, height: motion.f.h * motion.k, zIndex: 2000,
              transformOrigin: `${motion.f.cx * motion.k}px ${motion.f.cy * motion.k}px`,
              transform: motion.flip ? "scaleX(-1)" : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
}
