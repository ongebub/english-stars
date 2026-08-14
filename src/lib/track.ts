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
  }).catch(() => {});

  pixelTrack(event as FunnelEvent, { plan });
}
