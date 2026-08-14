import crypto from "crypto";

/**
 * Meta Conversions API — server-side conversion events.
 *
 * Why server-side: the card is entered on Stripe's hosted checkout (another
 * domain) and the first real charge lands seven days after the trial starts,
 * with no browser present. AddPaymentInfo, StartTrial and Subscribe therefore
 * cannot be observed client-side, and browser pixel events are lost to ad
 * blockers besides.
 *
 * DISABLED UNTIL CONFIGURED. Requires:
 *   META_CAPI_ACCESS_TOKEN   - system user token with ads_management
 *   NEXT_PUBLIC_FB_PIXEL_ID  - the pixel id (shared with the browser pixel)
 * When the token is absent every call is a logged no-op. It never throws, so a
 * misconfiguration can never break a Stripe webhook.
 *
 * PERSONAL DATA: Meta requires at least one user_data identifier to attribute a
 * conversion. We send ONLY a SHA-256 hash of the internal Supabase user UUID as
 * external_id. No email, no name, no raw id. This is server-to-server and the
 * hash is not reversible. If Chris wants zero identifiers, set
 * META_CAPI_SEND_EXTERNAL_ID=false — attribution quality will drop sharply.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";
const SEND_EXTERNAL_ID = process.env.META_CAPI_SEND_EXTERNAL_ID !== "false";
const API_VERSION = "v21.0";

export type CapiEvent = "AddPaymentInfo" | "StartTrial" | "Subscribe";

type CapiOptions = {
  /** Internal Supabase user id. Hashed before sending; never sent raw. */
  userId?: string | null;
  value?: number;
  currency?: string;
  /** Stable id so a browser-side duplicate of the same event is deduped. */
  eventId?: string;
  plan?: string | null;
};

const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export function isCapiConfigured(): boolean {
  return Boolean(PIXEL_ID && ACCESS_TOKEN);
}

export async function sendCapiEvent(
  event: CapiEvent,
  opts: CapiOptions = {}
): Promise<{ ok: boolean; reason?: string }> {
  if (!isCapiConfigured()) {
    console.warn(
      `[meta-capi] ${event} NOT sent — META_CAPI_ACCESS_TOKEN or NEXT_PUBLIC_FB_PIXEL_ID is unset. ` +
        `This conversion is not being reported to Meta.`
    );
    return { ok: false, reason: "not_configured" };
  }

  const user_data: Record<string, unknown> = {};
  if (SEND_EXTERNAL_ID && opts.userId) user_data.external_id = sha256(opts.userId);

  const custom_data: Record<string, unknown> = {};
  if (opts.value != null) custom_data.value = opts.value;
  if (opts.currency) custom_data.currency = opts.currency;
  if (opts.plan) custom_data.content_category = opts.plan;

  const body = {
    data: [
      {
        event_name: event,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: "https://www.englishallstars.com",
        ...(opts.eventId ? { event_id: opts.eventId } : {}),
        user_data,
        custom_data,
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[meta-capi] ${event} failed — HTTP ${res.status}: ${text}`);
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    // Never let an analytics failure break a Stripe webhook.
    console.error(`[meta-capi] ${event} threw:`, err);
    return { ok: false, reason: "exception" };
  }
}
