/**
 * Stripe webhook for worksheet purchases ONLY.  URL: /api/worksheets/webhook
 * (no hyphens, as the Stripe dashboard requires on this project).
 *
 * Kept apart from the subscription webhook (/api/stripe/webhook, and its alias
 * /api/stripe-webhook) on purpose:
 *   - its own route file; nothing in the subscription handler was edited;
 *   - its own signing secret, STRIPE_WORKSHEETS_WEBHOOK_SECRET, because a Stripe
 *     endpoint registered in the dashboard has one secret of its own;
 *   - it acts only on sessions whose metadata.kind is "worksheet", which only
 *     /api/worksheets/checkout sets, and ignores every other event with a 200.
 * In the other direction, the subscription handler's checkout.session.completed
 * branch needs `metadata.supabase_user_id` AND `session.subscription`; a
 * worksheet session has neither, so it falls straight through there.
 *
 * Until Chris registers this URL in the Stripe dashboard no event reaches it.
 * The thanks page fulfils the order itself in the meantime, so buyers are served
 * either way; the webhook is what covers a buyer who closes the tab.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfilWorksheetSession, isWorksheetSession, supabaseStore } from "@/lib/worksheet-orders";
import { sendWorksheetPurchaseEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WORKSHEETS_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret) {
    console.error("STRIPE_WORKSHEETS_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    // constructEvent only uses the key for API calls we do not make here.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" as const });
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Worksheet webhook signature error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true, ignored: event.type });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (!isWorksheetSession(session)) return NextResponse.json({ received: true, ignored: "not a worksheet session" });

  try {
    const result = await fulfilWorksheetSession(session, {
      store: supabaseStore(),
      sendEmail: (to, offer, links) => sendWorksheetPurchaseEmail(to, { title: offer.title, links }),
    });
    console.log(`Worksheet webhook ${event.id}: ${result.status}`);
    return NextResponse.json({ received: true, status: result.status });
  } catch (err) {
    // 500 makes Stripe retry, which is what we want for a failed email or write.
    console.error("Worksheet fulfilment failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Fulfilment failed" }, { status: 500 });
  }
}
