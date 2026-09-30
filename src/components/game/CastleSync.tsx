"use client";

import { useEffect } from "react";

/**
 * Asks the server to record castles that the map can see are complete but that
 * have no game_progress row yet (e.g. finished before Game mode existed).
 * Fire-and-forget; the map itself never depends on it.
 */
export function CastleSync({ subjectIds }: { subjectIds: string[] }) {
  const key = subjectIds.join(",");
  useEffect(() => {
    if (!key) return;
    for (const id of key.split(",")) {
      fetch("/api/game/complete-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: id }),
      }).catch(() => { /* silent */ });
    }
  }, [key]);
  return null;
}
