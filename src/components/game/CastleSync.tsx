"use client";

import { useEffect } from "react";
import { markCelebrated } from "@/lib/game/celebrated";

/**
 * Asks the server to record castles that the map can see are complete but that
 * have no game_progress row yet (e.g. finished before Game mode existed).
 * Fire-and-forget; the map itself never depends on it.
 */
export function CastleSync({ subjectIds, silentKeys = [] }: { subjectIds: string[]; silentKeys?: string[] }) {
  const key = subjectIds.join(",");
  useEffect(() => {
    if (!key) return;
    // These castles were finished before the server recorded anything. Recording them now must
    // not make the map treat them as "just completed" and play a fanfare for each.
    silentKeys.forEach(markCelebrated);
    for (const id of key.split(",")) {
      fetch("/api/game/complete-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: id }),
      }).catch(() => { /* silent */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
