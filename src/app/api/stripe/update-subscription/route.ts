import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const BASE_PRICE = 75000;
const PER_CHILD_PRICE = 25000;

export async function POST() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia" as const,
    });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get current subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, child_count")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    // Count current children
    const { count: childCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .eq("role", "child");

    const newChildCount = Math.max(childCount || 0, 1);
    const extraChildren = newChildCount - 1;
    const newPrice = BASE_PRICE + (extraChildren * PER_CHILD_PRICE);

    // Find the active Stripe subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: subscription.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No active Stripe subscription found" }, { status: 400 });
    }

    const stripeSub = subscriptions.data[0];
    const itemId = stripeSub.items.data[0].id;

    // Update the subscription with new price
    await stripe.subscriptions.update(stripeSub.id, {
      items: [
        {
          id: itemId,
          price_data: {
            currency: "thb",
            product: stripeSub.items.data[0].price.product as string,
            unit_amount: newPrice,
            recurring: { interval: "month" },
          },
        },
      ],
      metadata: {
        child_count: String(newChildCount),
      },
      proration_behavior: "create_prorations",
    });

    // Update local DB
    await supabase
      .from("subscriptions")
      .update({
        child_count: newChildCount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      child_count: newChildCount,
      monthly_total: newPrice / 100,
    });
  } catch (error: unknown) {
    console.error("Subscription update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
