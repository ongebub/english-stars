import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const BASE_PRICE = 75000; // 750 THB in satang
const PER_CHILD_PRICE = 25000; // 250 THB in satang

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia" as const,
    });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse optional child_count from request body
    let requestedChildCount = 1;
    try {
      const body = await req.json();
      if (body.child_count && typeof body.child_count === "number" && body.child_count >= 1) {
        requestedChildCount = body.child_count;
      }
    } catch {
      // No body or invalid JSON - use default
    }

    // Count actual children for this parent
    const { count: actualChildCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .eq("role", "child");

    // Use the greater of requested or actual child count (minimum 1)
    const childCount = Math.max(requestedChildCount, actualChildCount || 0, 1);
    const extraChildren = childCount - 1;
    const totalPrice = BASE_PRICE + (extraChildren * PER_CHILD_PRICE);

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: "English Stars Monthly",
              description: `Monthly subscription – ${childCount} child${childCount > 1 ? "ren" : ""} (฿750 base + ฿250 × ${extraChildren} extra)`,
            },
            unit_amount: totalPrice,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/learn?subscribed=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/subscribe`,
      metadata: {
        supabase_user_id: user.id,
        child_count: String(childCount),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
