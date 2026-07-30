"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import PlanCards, { type PlanChoice } from "@/components/PlanCards";

/**
 * /subscribe — for LOGGED-IN users who don't yet have a subscription.
 * New signups use /signup instead (plan-first flow).
 *
 * Plan naming mapping:
 * - UI "Family" => DB tier = 'individual' (Stripe webhook depends on this value)
 * - UI "Tutor"  => DB tier = 'tutor'
 */
export default function SubscribePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirect if not logged in (should use /signup instead) or already subscribed
  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in — redirect to the new signup flow
        router.replace("/signup");
        return;
      }

      // Check for existing subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      if (sub) {
        // Already subscribed
        router.replace("/learn");
        return;
      }

      setCheckingAuth(false);
    }
    check();
  }, [supabase, router]);

  async function handleCheckout(plan: PlanChoice) {
    setLoading(true);
    setError("");

    try {
      // Set account_type on profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const accountType = plan.tier === "individual" ? "family" : "tutor";
        await supabase
          .from("profiles")
          .update({ account_type: accountType })
          .eq("id", user.id)
          .eq("role", "parent");
      }

      const body =
        plan.tier === "individual"
          ? { tier: "individual" }
          : { tier: "tutor", seat_count: plan.seatCount };

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not create checkout session");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-text-mid animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo-small.png"
            alt="English Allstars"
            width={120}
            height={120}
            className="mx-auto mb-3"
          />
          <h1 className="text-2xl font-extrabold text-text-dark dark:text-white font-nunito">
            Subscribe to English Allstars
          </h1>
          <p className="font-sarabun text-text-mid dark:text-gray-300 mt-1">
            สมัครสมาชิก English Allstars
          </p>
        </div>

        {/* Tier cards — shared component */}
        <div className="mb-6">
          <PlanCards onSelectPlan={handleCheckout} loading={loading} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Secure payment */}
        <p className="text-center text-xs text-text-light dark:text-gray-400 mt-4">
          Secure payment via Stripe &middot; ชำระเงินปลอดภัยผ่าน Stripe
        </p>
        <p className="text-center text-xs text-text-light dark:text-gray-400 mt-2">
          By subscribing you agree to our{" "}
          <Link href="/terms" className="text-sky-dark hover:underline">
            Terms
          </Link>
          {" & "}
          <Link href="/privacy" className="text-sky-dark hover:underline">
            Privacy Policy
          </Link>
        </p>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            href="/learn"
            className="text-sky-dark font-semibold text-sm hover:underline"
          >
            &larr; Back to Learning &middot; กลับไปเรียน
          </Link>
        </div>

        {/* ABCs free notice */}
        <div className="bg-sun/30 rounded-xl p-4 mt-6 text-center">
          <p className="text-sm text-text-dark dark:text-white font-semibold">
            ABCs subject is free!
          </p>
          <p className="font-sarabun text-xs text-text-mid dark:text-gray-300">
            วิชา ABCs เรียนฟรี!
          </p>
        </div>

        {/* Contact */}
        <div className="text-center mt-6">
          <p className="text-xs text-text-light dark:text-gray-400">
            Questions? Contact us at{" "}
            <a
              href="mailto:info@englishallstars.com"
              className="text-sky-dark hover:underline"
            >
              info@englishallstars.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
