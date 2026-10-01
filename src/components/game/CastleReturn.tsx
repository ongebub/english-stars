"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProgressId } from "@/lib/progress-id.client";
import { getLearnContextClient, mapHref, ollieKey } from "@/lib/game/context";

const COUNTDOWN = 6;

/**
 * Game context only. After an activity ends, ask the server whether this castle is
 * now complete. If it is, and it is the castle the child left the map on (so the
 * fanfare has not played yet), offer a short countdown back to the map. Replaying
 * an already-celebrated castle never auto-leaves.
 */
export function CastleReturn({ subjectSlug, subjectId, ready, delayMs = 0 }: {
  subjectSlug: string; subjectId: string; ready: boolean; delayMs?: number;
}) {
  const router = useRouter();
  const [href, setHref] = useState<string | null>(null);
  const [left, setLeft] = useState(COUNTDOWN);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const ctx = getLearnContextClient();
    if (ctx.mode !== "game" || !ctx.band) return;
    let dead = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/game/complete-check", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject_id: subjectId }),
        });
        const data = await res.json();
        if (!data.complete || dead) return;
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const pid = await getProgressId(supabase, user.id);
        let last: string | null = null;
        try { last = localStorage.getItem(ollieKey(pid, ctx.band!)); } catch { /* private mode */ }
        if (last === subjectSlug && !dead) setHref(mapHref(ctx.band));
      } catch { /* silent */ }
    }, delayMs);
    return () => { dead = true; clearTimeout(t); };
  }, [ready, subjectId, subjectSlug, delayMs]);

  useEffect(() => {
    if (!href || stopped) return;
    if (left <= 0) { router.push(href); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [href, left, stopped, router]);

  if (!href) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-center shadow-2xl ring-4 ring-amber-300 dark:bg-gray-800">
        <p className="font-fredoka text-lg font-semibold text-text-dark dark:text-gray-100">🏰 Castle conquered!</p>
        <p className="font-sarabun text-sm text-text-mid dark:text-gray-400">ผ่านปราสาทแล้ว! กลับไปดูธงบนแผนที่</p>
        <div className="mt-3 flex gap-2">
          <Link href={href} className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-leaf px-4 font-nunito text-sm font-bold text-white">
            {stopped ? "Back to map" : `Back to map (${left})`}
          </Link>
          {!stopped && (
            <button onClick={() => setStopped(true)} className="min-h-[48px] rounded-xl bg-gray-200 px-4 font-nunito text-sm font-bold text-text-dark">
              Stay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
