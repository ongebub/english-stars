import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function calculateFamilyPrice(childCount: number): number {
  if (childCount <= 1) return 75000;
  if (childCount === 2) return 100000;
  if (childCount === 3) return 125000;
  return 150000; // 4+ cap
}

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

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, child_count, plan_type")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    // Only auto-update for family plans
    if (subscription.plan_type !== "family") {
      return NextResponse.json({ error: "Auto-update only for family plans" }, { status: 400 });
    }

    const { count: childCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .eq("role", "child");

    const newChildCount = Math.max(childCount || 0, 1);
    const newPrice = calculateFamilyPrice(newChildCount);

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
      metadata: { child_count: String(newChildCount) },
      proration_behavior: "create_prorations",
    });

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
