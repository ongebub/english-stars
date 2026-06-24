export interface SchoolSession {
  child_id: string;
  child_name: string;
  school_name: string;
  join_code: string;
}

const STORAGE_KEY = "english-stars-school-session";

export function getSchoolSession(): SchoolSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SchoolSession;
  } catch {
    return null;
  }
}

export function setSchoolSession(data: SchoolSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearSchoolSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
