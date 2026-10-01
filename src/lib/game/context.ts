/**
 * Game/Tutor mode helpers shared by client and server code.
 *
 * The mode itself is per child profile (profiles.learn_mode, set only through the
 * PIN-protected /api/learn-mode route) and defaults to Game unless the subscription
 * tier is 'tutor'. It is resolved on the server (mode.server.ts) and handed to client
 * components through LearnModeProvider; nothing here reads or writes it.
 *
 * What remains here is a UI convenience: remembering which grade band's map the
 * child was last on, so "Back to Map" lands on the right map. It carries no
 * authority and is just a cookie.
 */
export const MAP_BAND_COOKIE = "eas_map_band";

/** Browser only. */
export function setMapBand(band: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${MAP_BAND_COOKIE}=${encodeURIComponent(band)}; path=/; SameSite=Lax; max-age=31536000`;
}

/** Browser only. */
export function getMapBandClient(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${MAP_BAND_COOKIE}=`));
  if (!m) return null;
  try { return decodeURIComponent(m.slice(MAP_BAND_COOKIE.length + 1)) || null; } catch { return null; }
}

export function mapHref(band: string | null): string {
  return band ? `/learn/map?band=${encodeURIComponent(band)}` : "/learn/map";
}

/** localStorage key holding the slug of the castle Ollie was last shown at (see GameMapStage). */
export function ollieKey(progressId: string, band: string): string {
  return `eas_ollie_at:${progressId}:${band}`;
}

/** The guided castle screen for a subject (game mode). */
export function castleHref(subjectSlug: string): string {
  return `/learn/${subjectSlug}/castle`;
}
