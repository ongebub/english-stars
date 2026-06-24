"use client";

import { useState } from "react";
import Link from "next/link";

const BASE_PRICE = 750;
const PER_CHILD_PRICE = 250;
const MAX_CHILDREN = 5;

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [childCount, setChildCount] = useState(1);

  const extraChildren = childCount - 1;
  const totalPrice = BASE_PRICE + extraChildren * PER_CHILD_PRICE;

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_count: childCount }),
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🦉</div>
          <h1 className="text-2xl font-extrabold text-text-dark">Subscribe to English Stars</h1>
          <p className="font-sarabun text-text-mid mt-1">สมัครสมาชิก English Stars</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          {/* Child count selector */}
          <div className="mb-6">
            <p className="text-sm font-bold text-text-dark mb-2 font-nunito">
              How many children? <span className="font-sarabun text-text-mid font-normal">จำนวนบุตร</span>
            </p>
            <div className="flex gap-2">
              {Array.from({ length: MAX_CHILDREN }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setChildCount(n)}
                  className={`flex-1 rounded-xl py-3 font-bold text-lg transition-all ${
                    childCount === n
                      ? "bg-sky-dark text-white shadow-md scale-105"
                      : "bg-gray-100 text-text-mid hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Price display */}
          <div className="text-center mb-4">
            <div className="text-4xl font-black text-sky-dark">฿{totalPrice.toLocaleString()}</div>
            <p className="text-text-mid font-semibold">/month &middot; ต่อเดือน</p>
          </div>

          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-1">
            <div className="flex justify-between font-nunito">
              <span className="text-text-mid">Base plan (1 child)</span>
              <span className="text-text-dark font-bold">฿{BASE_PRICE}</span>
            </div>
            {extraChildren > 0 && (
              <div className="flex justify-between font-nunito">
                <span className="text-text-mid">
                  {extraChildren} extra child{extraChildren > 1 ? "ren" : ""} &times; ฿{PER_CHILD_PRICE}
                </span>
                <span className="text-text-dark font-bold">฿{extraChildren * PER_CHILD_PRICE}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-1 flex justify-between font-nunito">
              <span className="text-text-dark font-bold">Total / รวม</span>
              <span className="text-sky-dark font-black">฿{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Pricing tiers */}
          <div className="bg-sun/20 rounded-xl p-3 mb-6 text-xs space-y-0.5 font-nunito">
            <p className="text-text-dark"><span className="font-bold">1 child:</span> ฿750/month</p>
            <p className="text-text-dark"><span className="font-bold">2 children:</span> ฿1,000/month</p>
            <p className="text-text-dark"><span className="font-bold">3 children:</span> ฿1,250/month</p>
            <p className="text-text-mid font-sarabun">เพิ่มเด็ก 1 คน +฿250/เดือน</p>
          </div>

          <ul className="space-y-3 mb-6">
            {[
              { en: "All subjects & modules", th: "ทุกวิชาและโมดูล" },
              { en: "Unlimited quizzes", th: "ทำแบบทดสอบไม่จำกัด" },
              { en: "Parent gradebook", th: "สมุดพกผู้ปกครอง" },
              { en: "New content monthly", th: "เนื้อหาใหม่ทุกเดือน" },
              { en: "Add more children anytime", th: "เพิ่มบุตรได้ตลอดเวลา" },
            ].map((item) => (
              <li key={item.en} className="flex items-start gap-3 text-sm">
                <span className="text-leaf text-lg">✓</span>
                <div>
                  <span className="text-text-dark font-semibold">{item.en}</span>
                  <span className="font-sarabun text-text-mid ml-2">{item.th}</span>
                </div>
              </li>
            ))}
          </ul>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : `Subscribe ฿${totalPrice.toLocaleString()}/mo · สมัครเลย`}
          </button>

          <p className="text-center text-xs text-text-light mt-4">
            Secure payment via Stripe · ชำระเงินปลอดภัยผ่าน Stripe
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/learn" className="text-sky-dark font-semibold text-sm hover:underline">
            ← Back to Learning · กลับไปเรียน
          </Link>
        </div>

        <div className="bg-sun/30 rounded-xl p-4 mt-6 text-center">
          <p className="text-sm text-text-dark font-semibold">🆓 ABCs subject is free!</p>
          <p className="font-sarabun text-xs text-text-mid">วิชา ABCs เรียนฟรี!</p>
        </div>
      </div>
    </div>
  );
}
