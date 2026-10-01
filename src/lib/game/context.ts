/**
 * Which way a child arrived in a subject: from the castle map ("game") or from the
 * plain subject grid ("tutor"). Stored in a session cookie so both server pages
 * and client engines can read it.
 *
 * Phase 4 replaces this with the child's real learn_mode (profiles.learn_mode,
 * default 'game' except tier='tutor'). Only the get/set functions and
 * the cookie name need to change; callers use these functions, not the cookie.
 */
export const LEARN_CTX_COOKIE = "eas_learn_ctx";

export interface LearnContext { mode: "game" | "tutor"; band: string | null }

export function parseLearnContext(raw: string | null | undefined): LearnContext {
  if (!raw) return { mode: "tutor", band: null };
  const [m, band] = decodeURIComponent(raw).split(":");
  return m === "game" ? { mode: "game", band: band || null } : { mode: "tutor", band: null };
}

/** Browser only. */
export function setLearnContext(mode: "game" | "tutor", band?: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LEARN_CTX_COOKIE}=${encodeURIComponent(mode === "game" ? `game:${band ?? ""}` : "tutor")}; path=/; SameSite=Lax`;
}

/** Browser only. */
export function getLearnContextClient(): LearnContext {
  if (typeof document === "undefined") return { mode: "tutor", band: null };
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${LEARN_CTX_COOKIE}=`));
  return parseLearnContext(m ? m.slice(LEARN_CTX_COOKIE.length + 1) : null);
}

export function mapHref(band: string | null): string {
  return band ? `/learn/map?band=${encodeURIComponent(band)}` : "/learn/map";
}

/** localStorage key holding the slug of the castle Ollie was last shown at (see GameMapStage). */
export function ollieKey(progressId: string, band: string): string {
  return `eas_ollie_at:${progressId}:${band}`;
}
