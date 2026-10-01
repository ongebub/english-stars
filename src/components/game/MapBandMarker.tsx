"use client";

import { useEffect } from "react";
import { setMapBand } from "@/lib/game/context";

/** Renders nothing; remembers which grade band's map is open. */
export function MapBandMarker({ band }: { band: string }) {
  useEffect(() => { setMapBand(band); }, [band]);
  return null;
}
