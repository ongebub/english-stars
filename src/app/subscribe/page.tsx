"use client";

import { useState } from "react";
import Link from "next/link";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
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
          <div className="text-center mb-6">
            <div className="text-4xl font-black text-sky-dark">฿750</div>
            <p className="text-text-mid font-semibold">/month · ต่อเดือน</p>
          </div>

          <ul className="space-y-3 mb-6">
            {[
              { en: "All subjects & modules", th: "ทุกวิชาและโมดูล" },
              { en: "Unlimited quizzes", th: "ทำแบบทดสอบไม่จำกัด" },
              { en: "Parent gradebook", th: "สมุดพกผู้ปกครอง" },
              { en: "New content monthly", th: "เนื้อหาใหม่ทุกเดือน" },
              { en: "Multiple child profiles", th: "โปรไฟล์เด็กหลายคน" },
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
            {loading ? "Loading..." : "Subscribe Now · สมัครเลย"}
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
