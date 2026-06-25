export interface ActiveChild {
  childId: string;
  childName: string;
  avatarEmoji: string;
  avatarUrl: string | null;
}

const STORAGE_KEY = "english_stars_active_child";

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
}
