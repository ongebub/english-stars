import type { MapBand } from "./rules";

/**
 * Where castles sit on each band's landscape. Measured by eye on the 1400px
 * WebP of each map (and checked by drawing markers over it).
 *   x, y : centre of a clearing, % of map width / height
 *   w    : castle sprite width, % of map width (sized to the clearing)
 * Listed in walking order along the path. A band with more than five castles
 * reuses the same five spots on every page.
 */
export interface Spot { x: number; y: number; w: number; /** put the name label above the castle (when the castle in front would cover it) */ labelTop?: boolean }

export const MAP_SPOTS: Record<MapBand, Spot[]> = {
  K: [
    { x: 61.1, y: 65.3, w: 15.0 },
    { x: 29.6, y: 60.2, w: 12.5 },
    { x: 17.6, y: 43.9, w: 11.0 },
    { x: 54.1, y: 27.8, w: 9.5 },
    { x: 71.1, y: 27.1, w: 9.5 },
  ],
  "1": [
    { x: 32.0, y: 68.2, w: 12.0 },
    { x: 56.6, y: 76.6, w: 12.5 },
    { x: 33.4, y: 44.2, w: 10.5, labelTop: true },
    { x: 51.2, y: 30.7, w: 9.0 },
    { x: 74.7, y: 37.8, w: 10.0 },
  ],
  "2": [
    { x: 23.2, y: 83.2, w: 11.5 },
    { x: 49.3, y: 73.0, w: 10.5 },
    { x: 49.3, y: 46.1, w: 8.5 },
    { x: 69.5, y: 33.5, w: 7.0 },
    { x: 78.5, y: 39.1, w: 8.0 },
  ],
  "3": [
    { x: 32.3, y: 65.6, w: 12.5 },
    { x: 55.7, y: 76.8, w: 13.0 },
    { x: 34.3, y: 44.2, w: 10.5, labelTop: true },
    { x: 52.0, y: 29.2, w: 9.0 },
    { x: 75.0, y: 37.8, w: 10.5 },
  ],
};

export const MAP_ASPECT = 16 / 9;
/** Below this stage width (px) the map scrolls sideways instead of shrinking. */
export const MAP_MIN_WIDTH_PX = 860;

export function mapSrcSet(band: MapBand): string {
  const k = band === "K" ? "k" : `g${band}`;
  return `/game/map-${k}-1400.webp 1400w, /game/map-${k}-2400.webp 2400w`;
}
export function mapFallback(band: MapBand): string {
  const k = band === "K" ? "k" : `g${band}`;
  return `/game/map-${k}-1400.webp`;
}

/**
 * Ollie's side-view frames. Empty until the art exists; when it does, convert the
 * frames to WebP (about 320px wide), drop them in public/game/ and list them here,
 * facing RIGHT (the component mirrors them for leftward travel). With fly frames
 * Ollie flies between castles; without, he hops using ollie-walk.webp.
 */
export const OLLIE_FLY_FRAMES: string[] = [];       // e.g. "/game/ollie-fly-1.webp", ...
export const OLLIE_WALKSIDE_FRAMES: string[] = [];  // e.g. "/game/ollie-walkside-1.webp", ...
export const OLLIE_STAND = "/game/ollie-stand.webp";
export const OLLIE_HOP = "/game/ollie-walk.webp";
export const OLLIE_WAVE = "/game/ollie-walk-wave.webp";
