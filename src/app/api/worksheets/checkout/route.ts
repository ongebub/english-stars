import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createWorksheetCheckout } from "@/lib/worksheet-checkout";

export const dynamic = "force-dynamic";

/**
 * POST { offer: "1".."6" | "bundle", lang?: "th" | "en" } -> { url }
 *
 * Public on purpose: a parent buying a PDF has no account. Creating a Checkout
 * session costs the buyer nothing until they pay on Stripe's page.
 *
 * Whether the offer is on sale is decided in createWorksheetCheckout, before
 * any Stripe call. While nothing is on sale this route answers 403 without
 * ever constructing a Stripe client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const lang = body?.lang === "en" ? "en" : "th";
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://englishallstars.com";

    // Lazy: the client is built only if the gate lets the request through.
    const stripe = {
      checkout: {
        sessions: {
          create: (params: Stripe.Checkout.SessionCreateParams) => {
            const real = new Stripe(process.env.STRIPE_SECRET_KEY!, {
              apiVersion: "2026-06-24.dahlia" as const,
            });
            return real.checkout.sessions.create(params);
          },
        },
      },
    };

    const result = await createWorksheetCheckout(stripe, body?.offer, { origin, lang });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error("Worksheet checkout error:", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
