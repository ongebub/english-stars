"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

/**
 * Post-email-confirmation landing page.
 * Reads the chosen plan from sessionStorage (saved during signup step 1),
 * sets account_type on the profile, then redirects to Stripe Checkout.
 *
 * Plan naming mapping:
 * - sessionStorage 'family' => DB tier = 'individual' (Stripe webhook depends on this)
 * - sessionStorage 'tutor'  => DB tier = 'tutor'
 */
export default function SignupCheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function proceed() {
      // Check auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Set device cookie
      try {
        const device_hash = await getDeviceFingerprint();
        document.cookie = `es_device_id=${device_hash}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
      } catch {
        // Non-critical
      }

      // Read plan from sessionStorage
      const storedPlan = sessionStorage.getItem("es_signup_plan");
      const storedSeats = sessionStorage.getItem("es_signup_seats");

      // Also check user metadata (set during signUp)
      const metaPlan = user.user_metadata?.plan;
      const metaSeats = user.user_metadata?.seats;

      const planLabel = storedPlan || metaPlan || "family";
      const seatCount = parseInt(storedSeats || metaSeats || "5", 10);

      // Determine DB tier and account_type
      const tier = planLabel === "tutor" ? "tutor" : "individual";
      const accountType = planLabel === "tutor" ? "tutor" : "family";

      // Set account_type on parent profile
      await supabase
        .from("profiles")
        .update({ account_type: accountType })
        .eq("id", user.id)
        .eq("role", "parent");

      // Start Stripe checkout
      const body =
        tier === "individual"
          ? { tier: "individual" }
          : { tier: "tutor", seat_count: seatCount };

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.url) {
        // Clear sessionStorage
        sessionStorage.removeItem("es_signup_plan");
        sessionStorage.removeItem("es_signup_seats");
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not create checkout session");
      }
    }

    proceed();
  }, [supabase, router]);

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <Image
          src="/logo-small.png"
          alt="English Allstars"
          width={100}
          height={100}
          className="mx-auto mb-4"
        />
        {error ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md">
            <p className="text-coral font-bold mb-2">Something went wrong</p>
            <p className="text-sm text-text-mid dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => router.push("/subscribe")}
              className="bg-leaf text-white font-bold px-6 py-3 rounded-xl hover:bg-leaf-dark transition-colors"
            >
              Try Again / ลองใหม่
            </button>
          </div>
        ) : (
          <div>
            <div className="text-xl text-text-mid dark:text-gray-300 animate-pulse mb-2">
              Setting up your subscription...
            </div>
            <p className="font-sarabun text-text-light dark:text-gray-400">
              กำลังตั้งค่าสมาชิกของคุณ...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
