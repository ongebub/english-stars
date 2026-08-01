/**
 * Alias route: /api/stripe-webhook  -->  /api/stripe/webhook
 *
 * The Stripe dashboard webhook URL was registered with a hyphen
 * (/api/stripe-webhook) but the actual handler lives at
 * /api/stripe/webhook (with a slash).  This proxy ensures both
 * paths work so no webhook events are missed.
 *
 * TODO: Once the Stripe dashboard URL is corrected to
 * /api/stripe/webhook, this file can be removed.
 */
import { POST } from "../stripe/webhook/route";

export { POST };

export const dynamic = "force-dynamic";
