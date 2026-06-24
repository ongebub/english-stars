import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function calculateFamilyPrice(childCount: number): number {
  if (childCount <= 1) return 75000;
  if (childCount === 2) return 100000;
  if (childCount === 3) return 125000;
  return 150000; // 4+ children capped
}

function calculateSchoolPrice(studentCount: number): number {
  if (studentCount <= 35) return studentCount * 25000;
  return studentCount * 20000; // 36+ gets lower rate on ALL
}

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

    let planType = "family";
    let childCount = 1;
    let schoolName = "";

    try {
      const body = await req.json();
      if (body.plan_type === "school") planType = "school";
      if (typeof body.child_count === "number" && body.child_count >= 1) {
        childCount = body.child_count;
      }
      if (typeof body.student_count === "number" && body.student_count >= 5) {
        childCount = body.student_count;
      }
      if (body.school_name) schoolName = body.school_name;
    } catch {
      // No body - defaults
    }

    // For family plans, ensure child_count reflects actual children
    if (planType === "family") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", user.id)
        .eq("role", "child");
      childCount = Math.max(childCount, count || 0, 1);
    }

    // Validate school plan minimum
    if (planType === "school" && childCount < 5) {
      return NextResponse.json({ error: "School plan requires minimum 5 students" }, { status: 400 });
    }

    const totalPrice = planType === "family"
      ? calculateFamilyPrice(childCount)
      : calculateSchoolPrice(childCount);

    const productName = planType === "family"
      ? "English Stars Family Plan"
      : "English Stars School Plan";

    const description = planType === "family"
      ? `Family plan – ${childCount} child${childCount > 1 ? "ren" : ""}`
      : `School plan – ${childCount} students${schoolName ? ` (${schoolName})` : ""}`;

    // Get or create Stripe customer
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
            product_data: { name: productName, description },
            unit_amount: totalPrice,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/${planType === "school" ? "school" : "learn"}?subscribed=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/subscribe`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
        child_count: String(childCount),
        school_name: schoolName,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
