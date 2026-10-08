/**
 * Worksheet packs that have a QR landing page at /pack/[id].
 *
 * The QR on every page of a pack encodes exactly
 * https://www.englishallstars.com/pack/<id>. Adding a pack means adding an
 * entry here and nothing else. `title` is for humans reading this file; the
 * page does not print it. An id that is not in this list redirects to the
 * home page (see src/app/pack/[id]/page.tsx).
 *
 * `plan` is the value written to signup_events.plan for the pack_scan_* events,
 * which is how a scan is tied back to its pack. It is deliberately not "family"
 * or "tutor", so it can never be mistaken for a subscription plan.
 */
export const PACKS = {
  "1": { plan: "pack-1", title: "English Interview & Entrance Practice, Grade 1" },
  "2": { plan: "pack-2", title: "ABC & Phonics Starter" },
  "3": { plan: "pack-3", title: "My First 100 English Words" },
  "4": { plan: "pack-4", title: "Read with Nong-Fah: Short Stories" },
  "5": { plan: "pack-5", title: "Grade 1 Entrance English: Practice Tests" },
  "6": { plan: "pack-6", title: "Numbers, Colors & Shapes" },
} as const;

export type PackId = keyof typeof PACKS;

export function getPack(id: string) {
  return Object.prototype.hasOwnProperty.call(PACKS, id) ? PACKS[id as PackId] : null;
}
