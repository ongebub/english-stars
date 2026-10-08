import type { Metadata } from "next";
import Stripe from "stripe";
import ThanksView, { type ThanksLink } from "./ThanksView";
import {
  downloadUrl,
  fulfilWorksheetSession,
  isWorksheetSession,
  supabaseStore,
  type Order,
} from "@/lib/worksheet-orders";
import { getOffer, fileLabels } from "@/lib/worksheet-shop";
import { sendWorksheetPurchaseEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "English Allstars", robots: { index: false, follow: false } };

/**
 * Success page. Does NOT trust the URL: it asks Stripe (a read-only retrieve)
 * whether the session is a paid worksheet session, and only then records the
 * order and shows the links. The session id is Stripe's unguessable
 * cs_live_... value, the same proof the app's /welcome page relies on.
 *
 * It runs the same idempotent fulfilment as the webhook, so a buyer is served
 * even before the webhook endpoint exists or if it is slow.
 */
export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let state: "ok" | "pending" | "notfound" = "notfound";
  let links: ThanksLink[] = [];

  if (session_id && /^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(session_id)) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" as const });
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (isWorksheetSession(session)) {
        const store = supabaseStore();
        let order: Order | null = null;
        try {
          const r = await fulfilWorksheetSession(session, {
            store,
            sendEmail: (to, offer, l) => sendWorksheetPurchaseEmail(to, { title: offer.title, links: l }),
          });
          if (r.status === "delivered") order = r.order;
          else if (r.status === "unpaid") state = "pending";
        } catch (e) {
          // The email may have failed after the order was saved; the buyer can still download.
          console.error("Thanks page fulfilment error:", e instanceof Error ? e.message : e);
          order = await store.getBySession(session.id);
        }
        const offer = order ? getOffer(order.offer) : null;
        if (order && offer) {
          state = "ok";
          links = fileLabels(offer).map((label, i) => ({
            label,
            href: downloadUrl(order!.download_token, i, ""),
          }));
        }
      }
    } catch (e) {
      console.error("Thanks page Stripe lookup failed:", e instanceof Error ? e.message : e);
    }
  }

  return <ThanksView state={state} links={links} />;
}
