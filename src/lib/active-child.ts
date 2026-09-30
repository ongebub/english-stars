export interface ActiveChild {
  childId: string;
  childName: string;
  avatarEmoji: string;
  avatarUrl: string | null;
}

const STORAGE_KEY = "english_stars_active_child";
// Mirrored into a cookie so server components (which cannot read localStorage)
// can see which child profile is active. Never trusted on its own: the server
// re-checks that the id is a child of the logged-in user.
export const ACTIVE_CHILD_COOKIE = "english_stars_active_child";

function writeCookie(value: string | null): void {
  if (typeof document === "undefined") return;
  document.cookie = value
    ? `${ACTIVE_CHILD_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`
    : `${ACTIVE_CHILD_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function setActiveChild(
  childId: string,
  childName: string,
  avatarEmoji: string,
  avatarUrl: string | null = null
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ childId, childName, avatarEmoji, avatarUrl })
  );
  writeCookie(childId);
}

export function getActiveChild(): ActiveChild | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveChild;
  } catch {
    return null;
  }
}

export function clearActiveChild(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  writeCookie(null);
}

/**
 * Re-mirror localStorage into the cookie. Covers a child selected before the
 * cookie existed, so server-rendered pages and browser writes agree.
 */
export function syncActiveChildCookie(): void {
  const active = getActiveChild();
  if (active) writeCookie(active.childId);
}
