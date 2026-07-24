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
    const newSeatCount: number = body.seat_count;

    if (!newSeatCount || newSeatCount < 5) {
      return NextResponse.json(
        { error: "Minimum 5 seats required" },
        { status: 400 }
      );
    }

    // Get current subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        "stripe_customer_id, stripe_subscription_id, tier, seat_count"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    if (subscription.tier !== "tutor") {
      return NextResponse.json(
        { error: "Seat updates are only available for tutor plans" },
        { status: 400 }
      );
    }

    // Validate seat_count >= current active student count
    const { count: activeStudents } = await supabase
      .from("tutor_students")
      .select("student_user_id", { count: "exact", head: true })
      .eq("tutor_user_id", user.id)
      .is("removed_at", null);

    if (activeStudents && newSeatCount < activeStudents) {
      return NextResponse.json(
        {
          error: `Cannot reduce below current student count (${activeStudents})`,
        },
        { status: 400 }
      );
    }

    // Update Stripe subscription quantity
    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );
    const itemId = stripeSub.items.data[0].id;

    await stripe.subscriptions.update(stripeSub.id, {
      items: [
        {
          id: itemId,
          quantity: newSeatCount,
        },
      ],
      proration_behavior: "create_prorations",
    });

    // Update DB
    await supabase
      .from("subscriptions")
      .update({
        seat_count: newSeatCount,
        child_count: newSeatCount,
        max_students: newSeatCount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    const monthlyTotal = (newSeatCount * 25000) / 100; // 250 THB per seat

    return NextResponse.json({
      seat_count: newSeatCount,
      monthly_total: monthlyTotal,
    });
  } catch (error: unknown) {
    console.error("Subscription update error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
