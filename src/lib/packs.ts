/**
 * Worksheet packs that have a QR landing page at /pack/[id].
 *
 * The QR on every page of a pack encodes exactly
 * https://www.englishallstars.com/pack/<id>. Adding a pack means adding an
 * entry here and nothing else. An id that is not in this list redirects to the
 * home page (see src/app/pack/[id]/page.tsx).
 *
 * `plan` is the value written to signup_events.plan for the pack_scan_* events,
 * which is how a scan is tied back to its pack. It is deliberately not "family"
 * or "tutor", so it can never be mistaken for a subscription plan.
 */
export const PACKS = {
  "1": { plan: "pack-1" },
} as const;

export type PackId = keyof typeof PACKS;

export function getPack(id: string) {
  return Object.prototype.hasOwnProperty.call(PACKS, id) ? PACKS[id as PackId] : null;
}
