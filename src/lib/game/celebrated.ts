/**
 * Browser-only record of "this castle's fanfare has been shown (or deliberately skipped)".
 *
 * The server knows when a castle was completed (game_progress.completed_at, which is set once
 * and never cleared) but not whether the fanfare was shown, and there is no column for that.
 * So the map offers a fanfare for a castle completed in the last RECENT_MS, and this marker
 * stops it repeating. It is kept in localStorage and sessionStorage, and in memory as a last
 * resort, so a private-mode browser still does not repeat it within a session. If every one of
 * those is unavailable the fanfare can repeat, but only until the RECENT_MS window closes.
 */
export const RECENT_MS = 10 * 60 * 1000;

const mem = new Set<string>();

export function celebratedKey(progressId: string, slug: string): string {
  return `eas_celebrated:${progressId}:${slug}`;
}

export function wasCelebrated(key: string): boolean {
  if (mem.has(key)) return true;
  try { if (localStorage.getItem(key)) return true; } catch { /* private mode */ }
  try { if (sessionStorage.getItem(key)) return true; } catch { /* storage blocked */ }
  return false;
}

export function markCelebrated(key: string): void {
  mem.add(key);
  const v = new Date().toISOString();
  try { localStorage.setItem(key, v); } catch { /* private mode */ }
  try { sessionStorage.setItem(key, v); } catch { /* storage blocked */ }
}
