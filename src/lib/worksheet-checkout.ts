/**
 * Builds the one-time Stripe Checkout session for a worksheet offer.
 *
 * Kept free of `new Stripe(...)` so a unit check can hand it a stub: Stripe is
 * LIVE with no test mode, and nothing in development may create a real session.
 * The route is the only place that constructs the real client.
 *
 * Inline price_data in THB, so no Product or Price exists in the Stripe
 * dashboard and none has to be created. Card only, matching the app.
 */
import type Stripe from "stripe";
import { getOffer, saleBlockers, type Offer } from "@/lib/worksheet-shop";

export type CheckoutCreator = {
  checkout: {
    sessions: {
      create: (params: Stripe.Checkout.SessionCreateParams) => Promise<{ url: string | null }>;
    };
  };
};

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string; blockers?: string[] };

/** What the webhook and success page look for to know a session is ours. */
export const WORKSHEET_KIND = "worksheet";

export async function createWorksheetCheckout(
  stripe: CheckoutCreator,
  offerId: unknown,
  opts: { origin: string; lang: "th" | "en" }
): Promise<CheckoutResult> {
  const offer: Offer | null = getOffer(offerId);
  if (!offer) return { ok: false, status: 400, error: "Unknown offer" };

  // The server-side gate. This runs BEFORE any Stripe call.
  const blockers = saleBlockers(offer);
  if (blockers.length > 0) {
    return { ok: false, status: 403, error: "This pack is not on sale", blockers };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    locale: opts.lang === "th" ? "th" : "en",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "thb",
          unit_amount: offer.priceThb * 100, // THB is a two-decimal currency: satang
          product_data: { name: offer.title },
        },
      },
    ],
    success_url: `${opts.origin}/worksheets/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/worksheets`,
    // NOTE: deliberately no supabase_user_id. The subscription webhook acts on
    // sessions that carry one together with a subscription; this one has neither.
    metadata: { kind: WORKSHEET_KIND, offer: offer.id },
  });

  if (!session.url) return { ok: false, status: 502, error: "No checkout URL returned" };
  return { ok: true, url: session.url };
}
