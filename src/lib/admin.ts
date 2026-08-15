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
  const raw = process.env.ADMIN_EMAIL;
  if (!raw) {
    // FAIL CLOSED. There used to be a hardcoded "ongebub@gmail.com" fallback
    // here, which meant a missing or misspelt env var silently granted that one
    // account instead of denying everyone. The independent security review
    // flagged it; production is now verified to set ADMIN_EMAIL, so the crutch
    // is gone. If you are locked out of /admin, the variable is missing — set it
    // in Vercel rather than reinstating a default.
    console.error(
      "[admin] ADMIN_EMAIL is not set — denying all admin access. Set it in the environment."
    );
    return [];
  }
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
