import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  try {
    // Verify the requesting user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();

    // Collect child profile IDs
    const { data: childProfiles } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("parent_id", user.id);

    const childIds = (childProfiles ?? []).map((p: { id: string }) => p.id);

    // Hard-delete related data for all children
    if (childIds.length > 0) {
      await Promise.all([
        adminSupabase.from("quiz_attempts").delete().in("child_id", childIds),
        adminSupabase.from("trophies").delete().in("child_id", childIds),
        adminSupabase.from("ebook_progress").delete().in("child_id", childIds),
      ]);

      // Hard-delete all child profiles
      await adminSupabase.from("profiles").delete().in("id", childIds);
    }

    // Hard-delete the user's own profile
    await adminSupabase.from("profiles").delete().eq("id", user.id);

    // Cancel any active Stripe subscription
    const { data: sub } = await adminSupabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (sub?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2026-06-24.dahlia" as const,
        });
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (stripeErr) {
        // Log but don't block deletion — subscription may already be canceled
        console.warn("Stripe cancel error during account deletion:", stripeErr);
      }
    }

    // Delete subscription record
    await adminSupabase.from("subscriptions").delete().eq("user_id", user.id);

    // Delete the auth user (this is irreversible)
    const { error: deleteAuthErr } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (deleteAuthErr) {
      console.error("Failed to delete auth user:", deleteAuthErr);
      return NextResponse.json(
        { error: "ไม่สามารถลบบัญชีได้ กรุณาติดต่อฝ่ายสนับสนุน" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Account deletion error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
