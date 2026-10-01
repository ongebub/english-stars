"use client";

import { useEffect } from "react";
import { setLearnContext } from "@/lib/game/context";

/** Renders nothing; records whether the child is on the map ("game") or the subject grid ("tutor"). */
export function LearnContextMarker({ mode, band }: { mode: "game" | "tutor"; band?: string }) {
  useEffect(() => { setLearnContext(mode, band); }, [mode, band]);
  return null;
}
