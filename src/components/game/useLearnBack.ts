"use client";

import { useEffect, useState } from "react";
import { castleHref, getMapBandClient, mapHref } from "@/lib/game/context";
import { useLearnMode } from "@/components/game/LearnModeProvider";

/**
 * Where "back" goes from inside an activity. Game mode: the castle screen (the map is
 * one tap further). Tutor mode: the subject page, exactly as before.
 * The mode comes from the server (LearnModeProvider); the band is a UI hint only.
 */
export function useLearnBack(subjectSlug: string) {
  const isGame = useLearnMode() === "game";
  const [band, setBand] = useState<string | null>(null);
  useEffect(() => { setBand(getMapBandClient()); }, []);
  return {
    isGame,
    band,
    href: isGame ? castleHref(subjectSlug) : `/learn/${subjectSlug}`,
    mapHref: mapHref(band),
  };
}
