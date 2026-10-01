"use client";

import { useEffect, useState } from "react";
import { castleHref, getLearnContextClient, mapHref } from "@/lib/game/context";

/**
 * Where "back" goes from inside an activity. Game context: the castle screen (the map is one tap further).
 * Otherwise (tutor / no flag): the subject page, exactly as before.
 * First render is the subject page so server and client markup match.
 */
export function useLearnBack(subjectSlug: string) {
  const [state, setState] = useState<{ isGame: boolean; band: string | null }>({ isGame: false, band: null });
  useEffect(() => {
    const c = getLearnContextClient();
    setState({ isGame: c.mode === "game", band: c.band });
  }, []);
  return {
    isGame: state.isGame,
    band: state.band,
    href: state.isGame ? castleHref(subjectSlug) : `/learn/${subjectSlug}`,
    mapHref: mapHref(state.band),
  };
}
