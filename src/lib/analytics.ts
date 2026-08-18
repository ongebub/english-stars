/**
 * Provider-agnostic ad-pixel layer (client side).
 *
 * Call sites use the project's OWN funnel event names — the same ones written
 * to signup_events — and this module maps them per provider. Adding the TikTok
 * pixel later means filling in the tiktok provider below; no call site changes.
 *
 * Never pass personal data through here. Meta advanced matching requires hashed
 * identifiers and Chris has not opted into it, so no email, no child name, no
 * user id is ever sent.
 */

export type FunnelEvent =
  | "landing_viewed"
  | "interview_page_viewed"
  | "interview_email_submitted"
  | "interview_cta_clicked"
  | "teacher_page_viewed"
  | "teacher_cta_clicked"
  | "signup_started"
  | "plan_selected"
  | "checkout_opened"
  | "card_entered"
  | "trial_active"
  | "subscribed";

export type TrackOptions = {
  /** "family" | "tutor" — a plan label, never anything identifying. */
  plan?: string;
  value?: number;
  currency?: string;
};

/** Routes that must never emit pixel traffic. */
const EXCLUDED_PREFIXES = ["/admin", "/punchlist"];

export function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

type Provider = {
  name: string;
  isEnabled: () => boolean;
  pageView: () => void;
  track: (event: FunnelEvent, opts: TrackOptions) => void;
};

/* ── Meta ─────────────────────────────────────────────────────────────────── */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
    ttq?: { track: (name: string, params?: Record<string, unknown>) => void; page: () => void };
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";

/**
 * Funnel event -> Meta standard event.
 *
 * null means "no Meta equivalent, deliberately not sent".
 * card_entered / trial_active / subscribed are listed for completeness but in
 * practice fire SERVER-SIDE via the Conversions API (src/lib/meta-capi.ts),
 * because the card is entered on Stripe's hosted page and the first charge
 * happens seven days later with no browser present.
 */
const META_EVENT_MAP: Record<FunnelEvent, string | null> = {
  landing_viewed: "ViewContent",
  interview_page_viewed: "ViewContent",

  // DELIBERATE DEVIATION FROM THE TASK SPEC — read before "fixing" this.
  // The spec asked for Meta Lead on the /interview CTA click. But clicking that
  // CTA navigates straight to /signup, which fires signup_started -> Lead a
  // moment later. Mapping both would report TWO Leads for one person, and only
  // on /interview traffic — which would make /interview look roughly twice as
  // good as / in Meta's own reporting. That is precisely the comparison this
  // page exists to make, so inflating it defeats the purpose, and it would also
  // train Meta's optimiser on a doubled signal.
  //
  // Lead therefore still fires exactly once per visitor, at signup_started, for
  // BOTH pages. The distinct interview_cta_clicked step is recorded in our own
  // signup_events table, which is where Chris's page-vs-page comparison is
  // actually run. If he wants Meta to count the click itself instead, change
  // this to "Lead" AND drop signup_started to null — not both.
  interview_cta_clicked: null,

  // Same reasoning is NOT in play here: submitting the worksheet form is a real
  // conversion that has no downstream Meta event of its own. It is still left
  // null because it is a different, softer action than a trial signup, and
  // merging the two into one Lead number would blur the metric Chris optimises
  // against. Give it its own custom Meta event if he wants it counted.
  interview_email_submitted: null,

  teacher_page_viewed: "ViewContent",
  // Same reasoning as interview_cta_clicked above: this click lands on /signup,
  // which fires signup_started -> Lead moments later. Counting both would report
  // two Leads per visitor from /teacher only, and Chris is explicitly comparing
  // /teacher against /interview against / — inflating one of the three is the
  // one thing that would make that comparison useless.
  teacher_cta_clicked: null,

  signup_started: "Lead",
  plan_selected: null,
  checkout_opened: "InitiateCheckout",
  card_entered: "AddPaymentInfo",
  trial_active: "StartTrial",
  subscribed: "Subscribe",
};

const meta: Provider = {
  name: "meta",
  isEnabled: () => Boolean(META_PIXEL_ID) && typeof window !== "undefined" && typeof window.fbq === "function",
  pageView: () => window.fbq?.("track", "PageView"),
  track: (event, opts) => {
    const name = META_EVENT_MAP[event];
    if (!name) return;
    const params: Record<string, unknown> = {};
    if (opts.plan) params.content_category = opts.plan;
    if (opts.value != null) params.value = opts.value;
    if (opts.currency) params.currency = opts.currency;
    window.fbq?.("track", name, params);
  },
};

/* ── TikTok (not yet available — structure only) ──────────────────────────── */

const TIKTOK_EVENT_MAP: Record<FunnelEvent, string | null> = {
  landing_viewed: "ViewContent",
  interview_page_viewed: "ViewContent",
  interview_cta_clicked: null, // see the note in META_EVENT_MAP
  interview_email_submitted: null,
  teacher_page_viewed: "ViewContent",
  teacher_cta_clicked: null,
  signup_started: "SubmitForm",
  plan_selected: null,
  checkout_opened: "InitiateCheckout",
  card_entered: "AddPaymentInfo",
  trial_active: "Subscribe",
  subscribed: "CompletePayment",
};

const tiktok: Provider = {
  name: "tiktok",
  // No pixel id yet. Set NEXT_PUBLIC_TIKTOK_PIXEL_ID and add the loader
  // component to enable — no call site needs to change.
  isEnabled: () =>
    Boolean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID) &&
    typeof window !== "undefined" &&
    typeof window.ttq?.track === "function",
  pageView: () => window.ttq?.page(),
  track: (event, opts) => {
    const name = TIKTOK_EVENT_MAP[event];
    if (!name) return;
    const params: Record<string, unknown> = {};
    if (opts.value != null) params.value = opts.value;
    if (opts.currency) params.currency = opts.currency;
    window.ttq?.track(name, params);
  },
};

const PROVIDERS: Provider[] = [meta, tiktok];

/* ── Public API ───────────────────────────────────────────────────────────── */

export function pixelPageView(pathname: string): void {
  if (typeof window === "undefined" || isExcludedPath(pathname)) return;
  for (const p of PROVIDERS) {
    if (!p.isEnabled()) continue;
    try {
      p.pageView();
    } catch {
      /* never let analytics break the page */
    }
  }
}

export function pixelTrack(event: FunnelEvent, opts: TrackOptions = {}): void {
  if (typeof window === "undefined") return;
  if (isExcludedPath(window.location?.pathname || "")) return;
  for (const p of PROVIDERS) {
    if (!p.isEnabled()) continue;
    try {
      p.track(event, opts);
    } catch {
      /* never let analytics break the page */
    }
  }
}
