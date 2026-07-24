import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-06-24.dahlia" as const,
    });
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const tier: string = body.tier;
    const seatCount: number | undefined = body.seat_count;

    if (tier !== "individual" && tier !== "tutor") {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'individual' or 'tutor'" },
        { status: 400 }
      );
    }

    if (tier === "tutor") {
      if (!seatCount || seatCount < 5) {
        return NextResponse.json(
          { error: "Tutor plan requires minimum 5 seats" },
          { status: 400 }
        );
      }
    }

    // Check for existing active/trialing subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (existingSub) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 409 }
      );
    }

    // Get or create Stripe customer
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = subRow?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || "https://englishallstars.com";

    const priceId =
      tier === "individual"
        ? process.env.STRIPE_PRICE_INDIVIDUAL!
        : process.env.STRIPE_PRICE_TUTOR!;

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price: priceId,
      quantity: tier === "tutor" ? seatCount! : 1,
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [lineItem],
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe`,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        tier,
        seat_count: tier === "tutor" ? String(seatCount) : "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
