import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/resend";
import { sendCapiEvent } from "@/lib/meta-capi";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia" as const,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    const message =
      err instanceof Error
        ? err.message
        : "Webhook signature verification failed";
    console.error("Webhook signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const PRICE_INDIVIDUAL = process.env.STRIPE_PRICE_INDIVIDUAL || "";
  const PRICE_TUTOR = process.env.STRIPE_PRICE_TUTOR || "";

  function detectTier(priceId: string, metadataTier?: string): string {
    if (priceId === PRICE_TUTOR) return "tutor";
    if (priceId === PRICE_INDIVIDUAL) return "individual";
    return metadataTier || "individual";
  }

  console.log(`Stripe webhook received: ${event.type} (${event.id})`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const seatCount = session.metadata?.seat_count
        ? parseInt(session.metadata.seat_count, 10)
        : null;

      if (userId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const priceId = sub.items.data[0]?.price.id || "";
        const tier = detectTier(priceId, session.metadata?.tier);

        // Which promotion code, if any, was redeemed.
        //
        // Stripe tracks how MANY times a code was redeemed but not by whom, and
        // the review-exchange programme is capped at 40 — Chris has to be able
        // to match those 40 redemptions back to accounts. Checkout completion is
        // the one moment both facts are in the same object.
        //
        // session.discounts[].promotion_code is the promo ID (promo_...), not
        // the code the customer typed, so the human-readable code costs one
        // extra retrieve. Both are stored: the text is what Chris searches by,
        // the id is stable if the text is later edited in Stripe.
        //
        // Wrapped in its own try/catch on purpose — failing to record a
        // marketing attribution must never cost the customer their subscription
        // row, which is what this handler actually exists to write.
        let promotionCode: string | null = null;
        let promotionCodeId: string | null = null;
        try {
          // Scan the whole discounts array rather than taking [0]. A session can
          // carry more than one discount — a customer-level coupon alongside the
          // redeemed promotion code — and there is no guarantee the promotion
          // code is first. Reading only index 0 silently attributed nothing in
          // that case, which is precisely the "which 40 people redeemed it"
          // question this column exists to answer.
          const rawPromo = session.discounts?.find((d) => d.promotion_code)
            ?.promotion_code;
          if (rawPromo) {
            promotionCodeId =
              typeof rawPromo === "string" ? rawPromo : rawPromo.id;
            const promo = await stripe.promotionCodes.retrieve(promotionCodeId);
            promotionCode = promo.code ?? null;
          }
        } catch (promoErr) {
          console.error("Failed to resolve promotion code on checkout:", promoErr);
        }

        const { error } = await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          status: sub.status,
          tier,
          seat_count: tier === "tutor" ? seatCount : null,
          plan: "monthly",
          plan_type: tier === "tutor" ? "school" : "family",
          current_period_end: new Date(
            sub.items.data[0].current_period_end * 1000
          ).toISOString(),
          trial_end: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end,
          child_count: tier === "tutor" ? seatCount : 1,
          max_students: tier === "tutor" ? seatCount : 4,
          promotion_code: promotionCode,
          promotion_code_id: promotionCodeId,
          updated_at: new Date().toISOString(),
        });

        if (error)
          console.error("Failed to upsert subscription on checkout:", error);

        // Also set profiles.account_type from the chosen plan
        const accountType = tier === "tutor" ? "tutor" : "family";
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ account_type: accountType })
          .eq("id", userId)
          .eq("role", "parent");

        if (profileError)
          console.error("Failed to set account_type on checkout:", profileError);

        // Send welcome email
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          const userEmail = authUser?.user?.email;
          if (userEmail) {
            const trialEndDate = sub.trial_end
              ? new Date(sub.trial_end * 1000).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "";
            if (trialEndDate) {
              await sendWelcomeEmail(userEmail, trialEndDate);
            }
          }
        } catch (emailErr) {
          console.error("Failed to send welcome email:", emailErr);
        }

        // Track trial_active signup event
        try {
          await supabase.from("signup_events").insert({
            session_id: session.id,
            user_id: userId,
            event: "trial_active",
            plan: tier,
          });
        } catch (trackErr) {
          console.error("Failed to track trial_active:", trackErr);
        }

        // Meta Conversions API. Both are server-side because the card is
        // entered on Stripe's hosted page, which we cannot observe from the
        // browser. No-ops with a warning until META_CAPI_ACCESS_TOKEN is set.
        await sendCapiEvent("AddPaymentInfo", {
          userId,
          plan: tier,
          eventId: `addpaymentinfo_${session.id}`,
        });
        await sendCapiEvent("StartTrial", {
          userId,
          plan: tier,
          value: 750,
          currency: "THB",
          eventId: `starttrial_${session.id}`,
        });
      }
      break;
    }

    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      // Look up user by stripe_customer_id
      const { data: existingRow } = await supabase
        .from("subscriptions")
        .select("user_id, tier, seat_count")
        .eq("stripe_customer_id", customerId)
        .single();

      if (existingRow) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items.data[0]?.price.id || null,
            status: sub.status,
            current_period_end: new Date(
              sub.items.data[0].current_period_end * 1000
            ).toISOString(),
            trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", existingRow.user_id);

        if (error)
          console.error("Failed to update on subscription.created:", error);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const updateData: Record<string, unknown> = {
        status: sub.status,
        current_period_end: new Date(
          sub.items.data[0].current_period_end * 1000
        ).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        trial_end: sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      // If quantity changed (tutor seat update), update seat_count
      const quantity = sub.items.data[0]?.quantity;
      if (quantity && quantity > 1) {
        updateData.seat_count = quantity;
        updateData.child_count = quantity;
        updateData.max_students = quantity;
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("stripe_customer_id", customerId);

      if (error)
        console.error("Failed to update subscription:", error);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      if (error)
        console.error("Failed to cancel subscription:", error);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        // Only update if currently past_due
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .eq("status", "past_due");

        if (error)
          console.error("Failed to update on payment_succeeded:", error);

        // Subscribe = the first REAL charge after the trial converts.
        // The trial-start invoice is 0 THB with billing_reason
        // "subscription_create", so requiring a positive amount on a
        // "subscription_cycle" invoice isolates the genuine conversion.
        const isFirstRealCharge =
          invoice.amount_paid > 0 && invoice.billing_reason === "subscription_cycle";

        if (isFirstRealCharge) {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("user_id, tier")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          await sendCapiEvent("Subscribe", {
            userId: subRow?.user_id ?? null,
            plan: subRow?.tier ?? null,
            value: invoice.amount_paid / 100,
            currency: (invoice.currency || "thb").toUpperCase(),
            eventId: `subscribe_${invoice.id}`,
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (error)
          console.error("Failed to update on payment_failed:", error);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
