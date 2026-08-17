import { pixelTrack, type FunnelEvent } from "@/lib/analytics";

/**
 * Records a funnel step. Writes to signup_events (our own funnel dashboard) and
 * fires the equivalent ad-pixel event, so both systems see the same steps.
 *
 * Pixel dispatch is best-effort and never blocks or throws — see analytics.ts.
 */
export function trackEvent(event: string, plan?: string) {
  let sessionId = sessionStorage.getItem("signup_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("signup_session", sessionId);
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, event, plan }),
    // keepalive lets the request outlive the page.
    //
    // Several funnel steps are recorded immediately before the browser leaves:
    // signup/page.tsx fires checkout_opened and then sets
    // window.location.href to Stripe's hosted page a few lines later. That is a
    // full document unload, and without keepalive the browser is free to cancel
    // the in-flight POST — so checkout_opened has been silently under-counted at
    // exactly the step the funnel is judged on.
    //
    // Same-origin Link clicks (e.g. /interview -> /signup) were never affected,
    // since those are client-side transitions and the document survives.
    keepalive: true,
  }).catch(() => {});

  pixelTrack(event as FunnelEvent, { plan });
}
