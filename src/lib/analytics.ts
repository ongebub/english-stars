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
