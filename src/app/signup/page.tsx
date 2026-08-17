"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import PlanCards, { type PlanChoice } from "@/components/PlanCards";
import { AppFooter } from "@/components/AppFooter";
import { trackEvent } from "@/lib/track";

/**
 * Signup flow: Step 1 = choose plan, Step 2 = create account.
 * After account creation, user is redirected to Stripe Checkout for the chosen plan.
 *
 * Plan naming mapping:
 * - UI "Family" => DB tier = 'individual' (Stripe webhook depends on this value)
 * - UI "Tutor"  => DB tier = 'tutor'
 */

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream dark:bg-gray-900 flex items-center justify-center">
          <div className="text-4xl animate-pulse">Loading...</div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for returning from /join path — students should never be here
  const redirect = searchParams.get("redirect");

  const [step, setStep] = useState<"plan" | "account">("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanChoice | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Fire signup_started on mount
  useEffect(() => {
    trackEvent("signup_started");
  }, []);

  // If user is already logged in, redirect appropriately
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Already logged in — check if they have a subscription
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (sub) {
          // Has subscription, go to learn
          router.replace("/learn");
        } else {
          // Logged in but no subscription — send to /subscribe
          router.replace("/subscribe");
        }
        return;
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, [supabase, router]);

  // On mount, check if plan was pre-selected via query params (e.g., after email confirm round-trip)
  useEffect(() => {
    const planParam = searchParams.get("plan");
    const seatsParam = searchParams.get("seats");

    // Also check sessionStorage for plan that survived email confirmation
    const storedPlan = sessionStorage.getItem("es_signup_plan");
    const storedSeats = sessionStorage.getItem("es_signup_seats");

    if (planParam === "family" || planParam === "tutor") {
      const plan: PlanChoice = {
        tier: planParam === "family" ? "individual" : "tutor",
        seatCount: planParam === "tutor" ? parseInt(seatsParam || "5", 10) : undefined,
      };
      setSelectedPlan(plan);
      setStep("account");
    } else if (storedPlan === "family" || storedPlan === "tutor") {
      const plan: PlanChoice = {
        tier: storedPlan === "family" ? "individual" : "tutor",
        seatCount:
          storedPlan === "tutor" ? parseInt(storedSeats || "5", 10) : undefined,
      };
      setSelectedPlan(plan);
      setStep("account");
    }
  }, [searchParams]);

  // If there's a /join redirect, send them to login page instead (students never see plan screen)
  useEffect(() => {
    if (redirect && redirect.startsWith("/join")) {
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [redirect, router]);

  function handlePlanSelect(plan: PlanChoice) {
    setSelectedPlan(plan);
    // Save to sessionStorage to survive potential email confirmation round trip
    const planLabel = plan.tier === "individual" ? "family" : "tutor";
    trackEvent("plan_selected", planLabel);
    sessionStorage.setItem("es_signup_plan", planLabel);
    if (plan.seatCount) {
      sessionStorage.setItem("es_signup_seats", String(plan.seatCount));
    }
    setStep("account");
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!agreedToTerms) {
      setError(
        "Please agree to the Terms & Conditions and Privacy Policy to create an account.\nกรุณายอมรับข้อกำหนดและเงื่อนไขและนโยบายความเป็นส่วนตัวเพื่อสร้างบัญชี"
      );
      return;
    }

    if (!selectedPlan) {
      setError("Please select a plan first.\nกรุณาเลือกแพลนก่อน");
      return;
    }

    setLoading(true);

    try {
      const planLabel = selectedPlan.tier === "individual" ? "family" : "tutor";

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/signup/checkout`,
          data: {
            plan: planLabel,
            seats: selectedPlan.seatCount ? String(selectedPlan.seatCount) : "",
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError(
            "This email is already registered. Please log in instead.\nอีเมลนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ"
          );
        } else if (signUpError.message.includes("password")) {
          setError(
            "Password must be at least 6 characters.\nรหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
          );
        } else {
          setError(
            "Something went wrong. Please try again.\nเกิดข้อผิดพลาด กรุณาลองใหม่"
          );
        }
        return;
      }

      // If session exists immediately (no email confirm required), proceed to checkout
      if (signUpData.session) {
        // Set account_type on the parent profile
        const accountType = selectedPlan.tier === "individual" ? "family" : "tutor";
        await supabase
          .from("profiles")
          .update({ account_type: accountType })
          .eq("id", signUpData.user!.id)
          .eq("role", "parent");

        // Set device cookie
        const device_hash = await getDeviceFingerprint();
        document.cookie = `es_device_id=${device_hash}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;

        // Go straight to Stripe checkout
        await startCheckout(selectedPlan);
      } else {
        // Email confirmation required — show success message
        // "proceed to payment" was the same lie as the old button label — the
        // next step adds a card to start the trial, it does not take money.
        setSuccess(
          "Check your email to confirm your account, then you'll add a card to start your free trial.\nตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วเพิ่มบัตรเพื่อเริ่มทดลองใช้ฟรี"
        );
      }
    } catch {
      setError(
        "Something went wrong. Please try again.\nเกิดข้อผิดพลาด กรุณาลองใหม่"
      );
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout(plan: PlanChoice) {
    trackEvent("checkout_opened", plan.tier === "individual" ? "family" : "tutor");

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
      // Clear sessionStorage plan data
      sessionStorage.removeItem("es_signup_plan");
      sessionStorage.removeItem("es_signup_seats");
      window.location.href = data.url;
    } else {
      setError(data.error || "Could not create checkout session");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-cream dark:bg-gray-900 flex items-center justify-center">
        <div className="text-xl text-text-mid animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="English Allstars"
            width={160}
            height={160}
            priority
            className="mx-auto mb-2"
          />
          {step === "plan" ? (
            <>
              <h1 className="text-2xl font-extrabold text-text-dark dark:text-white font-nunito">
                Choose Your Plan
              </h1>
              <p className="font-sarabun text-text-mid dark:text-gray-300 mt-1">
                เลือกแพลนของคุณ
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-text-dark dark:text-white font-nunito">
                Create Your Account
              </h1>
              <p className="font-sarabun text-text-mid dark:text-gray-300 mt-1">
                สร้างบัญชีของคุณ
              </p>
            </>
          )}
        </div>

        {/* Step 1: Plan Selection */}
        {step === "plan" && (
          <>
            <PlanCards
              onSelectPlan={handlePlanSelect}
              ctaLabel="Choose Plan"
              ctaLabelThai="เลือกแพลน"
            />

            {/* ABCs free notice */}
            <div className="bg-sun/30 rounded-xl p-4 mt-6 text-center">
              <p className="text-sm text-text-dark dark:text-white font-semibold">
                ABCs subject is free!
              </p>
              <p className="font-sarabun text-xs text-text-mid dark:text-gray-300">
                วิชา ABCs เรียนฟรี!
              </p>
            </div>

            {/*
              Discount-code disclosure.

              COLLAPSED BY DEFAULT, and deliberately NOT a code input. Showing an
              empty promo box to every visitor sends people off hunting for a code
              instead of paying, which costs more than the codes are worth.

              There is no input here because this flow uses HOSTED Stripe
              Checkout: the code is entered on Stripe's own page, which now
              renders an "Add promotion code" field because the session sets
              allow_promotion_codes. Duplicating the box here would mean
              collecting a code we cannot validate and then asking for it again a
              screen later. This only tells the few people holding a code that it
              will be honoured, and where to put it.
            */}
            <details className="mt-4 text-center">
              <summary className="cursor-pointer list-none text-sm font-semibold text-sky-dark hover:underline">
                <span className="font-sarabun">มีโค้ดส่วนลด?</span>{" "}
                <span className="font-nunito">Have a discount code?</span>
              </summary>
              <div className="mt-2 px-2">
                <p className="font-sarabun text-xs text-text-mid dark:text-gray-300 leading-relaxed">
                  กรอกโค้ดได้ในหน้าถัดไป ตรงช่อง &quot;Add promotion code&quot;
                  ก่อนยืนยันการสมัคร
                </p>
                <p className="font-nunito text-xs text-text-mid dark:text-gray-300 mt-1 leading-relaxed">
                  Enter it on the next page, under &quot;Add promotion
                  code&quot;, before you confirm.
                </p>
              </div>
            </details>

            {/* Already have an account */}
            <div className="text-center mt-6">
              <Link
                href="/login"
                className="text-sky-dark font-semibold text-sm hover:underline"
              >
                Already have an account? Log in / มีบัญชีแล้ว? เข้าสู่ระบบ
              </Link>
            </div>

            {/* Join class link */}
            <div className="text-center mt-3">
              <Link
                href="/join"
                className="inline-flex items-center gap-2 text-sky-dark font-bold text-sm hover:underline"
              >
                Join a class / เข้าร่วมชั้นเรียน
              </Link>
            </div>
          </>
        )}

        {/* Step 2: Account Creation */}
        {step === "account" && (
          <div className="max-w-md mx-auto">
            {/* Selected plan badge */}
            <div className="text-center mb-6">
              <span className="inline-block bg-sky-dark/10 dark:bg-sky-dark/20 text-sky-dark font-bold text-sm px-4 py-2 rounded-xl font-nunito">
                {selectedPlan?.tier === "individual"
                  ? "Family Plan · แพลนครอบครัว"
                  : `Tutor Plan · ${selectedPlan?.seatCount || 5} students`}
              </span>
              <button
                type="button"
                onClick={() => setStep("plan")}
                className="block mx-auto mt-2 text-xs text-sky-dark hover:underline"
              >
                Change plan / เปลี่ยนแพลน
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <form onSubmit={handleCreateAccount} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-bold text-text-dark dark:text-white mb-1"
                  >
                    <span className="font-nunito">Email</span>{" "}
                    <span className="font-sarabun text-text-mid dark:text-gray-300">
                      อีเมล
                    </span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 px-4 py-3 min-h-[48px] text-text-dark dark:text-white dark:bg-gray-700
                               focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                               transition-colors"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-bold text-text-dark dark:text-white mb-1"
                  >
                    <span className="font-nunito">Password</span>{" "}
                    <span className="font-sarabun text-text-mid dark:text-gray-300">
                      รหัสผ่าน
                    </span>
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 px-4 py-3 min-h-[48px] text-text-dark dark:text-white dark:bg-gray-700
                               focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                               transition-colors"
                  />
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-sky-dark focus:ring-sky-dark/30 flex-shrink-0"
                  />
                  <span className="text-sm text-text-mid dark:text-gray-300">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-sky-dark font-semibold hover:underline"
                    >
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-sky-dark font-semibold hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    <br />
                    <span className="font-sarabun">
                      ฉันยอมรับ{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-sky-dark font-semibold hover:underline"
                      >
                        ข้อกำหนดและเงื่อนไข
                      </Link>{" "}
                      และ{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-sky-dark font-semibold hover:underline"
                      >
                        นโยบายความเป็นส่วนตัว
                      </Link>
                    </span>
                  </span>
                </label>

                {/* Error message */}
                {error && (
                  <div className="bg-coral/20 border-2 border-coral rounded-xl p-4 text-sm text-text-dark dark:text-white whitespace-pre-line">
                    {error}
                  </div>
                )}

                {/* Success message */}
                {success && (
                  <div className="bg-leaf/20 border-2 border-leaf rounded-xl p-4 text-sm text-text-dark dark:text-white whitespace-pre-line">
                    {success}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-4 min-h-[48px] font-bold text-white text-lg
                             transition-all disabled:opacity-50
                             bg-gradient-to-r from-sky-dark to-leaf hover:from-sky-dark/90 hover:to-leaf/90
                             shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span>Creating account...</span>
                    </span>
                  ) : (
                    <span>
                      {/*
                        NOT "Create Account & Pay" / "สร้างบัญชีและชำระเงิน".
                        That told the parent they were being charged NOW, which is
                        false — this starts a 7-day trial and the first charge is
                        seven days away. It is the most likely reason people
                        reached this button and stopped.
                        The card requirement is NOT hidden: it is stated in the
                        trial terms directly below this button.
                      */}
                      <span className="font-sarabun">เริ่มทดลองใช้ฟรี 7 วัน</span>{" "}
                      <span className="font-nunito">Start 7-day free trial</span>
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Already have an account */}
            <div className="text-center mt-6">
              <Link
                href="/login"
                className="text-sky-dark font-semibold text-sm hover:underline"
              >
                Already have an account? Log in / มีบัญชีแล้ว? เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        )}

        {/*
          Trial terms. These used to be absent entirely — the page said only
          "Secure payment via Stripe", which implied an immediate charge without
          ever stating the trial. Now that the button says "free trial", the card
          requirement HAS to be visible here or the button would be the
          misleading one instead. Honest in both directions: the no-charge
          promise is bold and first, the card requirement is plain text right
          under it, and neither is fine print.
        */}
        <div className="mt-6 rounded-xl bg-leaf/10 dark:bg-leaf/15 px-4 py-3 text-center">
          <p className="font-sarabun text-sm font-bold text-text-dark dark:text-white">
            ไม่มีการเรียกเก็บเงินใน 7 วันแรก
          </p>
          <p className="font-nunito text-sm font-bold text-text-dark dark:text-white">
            No charge during the first 7 days.
          </p>
          <p className="font-sarabun text-xs text-text-mid dark:text-gray-300 mt-2 leading-relaxed">
            ต้องใช้บัตรเครดิตหรือบัตรเดบิตเพื่อเริ่มทดลองใช้ หลังจากครบ 7 วัน
            ระบบจะเรียกเก็บเงินโดยอัตโนมัติ ยกเลิกได้ตลอดเวลาก่อนครบ 7 วัน
            โดยไม่มีค่าใช้จ่าย
          </p>
          <p className="font-nunito text-xs text-text-mid dark:text-gray-300 mt-1 leading-relaxed">
            A credit or debit card is required to start. After day 7 you are
            charged automatically. Cancel any time before then at no charge.
          </p>
        </div>

        <p className="text-center text-xs text-text-light dark:text-gray-400 mt-3">
          Secure payment via Stripe &middot; ชำระเงินปลอดภัยผ่าน Stripe
        </p>

        {/* Footer */}
        <div className="mt-4">
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
