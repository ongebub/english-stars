/**
 * Who is allowed into the internal review tools (/admin/*, /punchlist).
 *
 * ADMIN_EMAIL accepts a single address or a comma-separated list, so adding a
 * reviewer is an env-var change rather than a code change. Comparison is
 * case-insensitive and trims whitespace, because env vars are hand-edited.
 *
 * Server-side only — ADMIN_EMAIL is deliberately not NEXT_PUBLIC_, so the list
 * never reaches the browser bundle.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "ongebub@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
