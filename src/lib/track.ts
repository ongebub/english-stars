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
}
