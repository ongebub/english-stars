import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-05-27.dahlia" as const,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const supabase = getSupabase();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const planType = session.metadata?.plan_type || "family";
      const childCount = parseInt(session.metadata?.child_count || "1", 10);
      const schoolName = session.metadata?.school_name || "";

      if (userId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as { current_period_end: number };

        const maxStudents = planType === "school" ? childCount : 4;

        const { error } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          status: "active",
          plan: "monthly",
          plan_type: planType,
          child_count: childCount,
          max_students: maxStudents,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) console.error("Failed to upsert subscription:", error);

        // Generate school join code if school plan
        if (planType === "school" && schoolName) {
          let code = generateJoinCode();
          let attempts = 0;
          // Ensure unique code
          while (attempts < 10) {
            const { error: codeError } = await supabase.from("school_codes").insert({
              user_id: userId,
              code,
              school_name: schoolName,
              max_students: maxStudents,
            });
            if (!codeError) break;
            code = generateJoinCode();
            attempts++;
          }
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const subData = event.data.object as unknown as { customer: string; status: string; current_period_end: number };
      const customerId = subData.customer;
      const status = subData.status === "active" ? "active" : subData.status === "past_due" ? "past_due" : "canceled";
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status,
          current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      if (updateError) console.error("Failed to update subscription:", updateError);
      break;
    }
    case "customer.subscription.deleted": {
      const subData2 = event.data.object as unknown as { customer: string };
      const customerId = subData2.customer;
      const { error: cancelError } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);
      if (cancelError) console.error("Failed to cancel subscription:", cancelError);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
