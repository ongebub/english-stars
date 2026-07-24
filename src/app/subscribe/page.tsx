"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seatCount, setSeatCount] = useState(5);

  const tutorTotal = seatCount * 250;

  async function handleCheckout(tier: "individual" | "tutor") {
    setLoading(true);
    setError("");

    try {
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
          <h1 className="text-2xl font-extrabold text-text-dark font-nunito">
            Subscribe to English Allstars
          </h1>
          <p className="font-sarabun text-text-mid mt-1">
            สมัครสมาชิก English Allstars
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Individual / For Parents */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-sky-dark/20 transition-all flex flex-col">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">👨‍👩‍👧</div>
              <h2 className="text-xl font-bold text-text-dark font-nunito">
                For Parents
              </h2>
              <p className="font-sarabun text-text-mid text-sm">
                สำหรับผู้ปกครอง
              </p>
            </div>

            {/* Price */}
            <div className="text-center mb-4 py-3 bg-sky-dark/5 rounded-xl">
              <div className="text-4xl font-black text-sky-dark">฿750</div>
              <p className="text-text-mid font-semibold">/month &middot; ต่อเดือน</p>
            </div>

            {/* Free trial badge */}
            <div className="text-center mb-4">
              <span className="inline-block bg-sun/30 text-text-dark font-bold text-sm px-4 py-1 rounded-xl font-nunito">
                7-day free trial &middot; ทดลองฟรี 7 วัน
              </span>
            </div>

            {/* Bullet points */}
            <ul className="space-y-2 mb-6 flex-1">
              {[
                { en: "All subjects & modules", th: "ทุกวิชาและโมดูล" },
                { en: "Unlimited quizzes", th: "ทำแบบทดสอบไม่จำกัด" },
                { en: "Parent gradebook", th: "สมุดพกผู้ปกครอง" },
                { en: "New content monthly", th: "เนื้อหาใหม่ทุกเดือน" },
              ].map((item) => (
                <li key={item.en} className="flex items-start gap-3 text-sm">
                  <span className="text-leaf text-lg">&#10003;</span>
                  <div>
                    <span className="text-text-dark font-semibold">{item.en}</span>
                    <span className="font-sarabun text-text-mid ml-2">{item.th}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handleCheckout("individual")}
              disabled={loading}
              className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Start Free Trial · เริ่มทดลองฟรี"}
            </button>
          </div>

          {/* Tutor */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-sky-dark/30 transition-all flex flex-col relative">
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-sky-dark text-white text-xs font-bold px-4 py-1 rounded-xl font-nunito">
                Popular for tutors
              </span>
            </div>

            <div className="text-center mb-4 mt-2">
              <div className="text-4xl mb-2">🏫</div>
              <h2 className="text-xl font-bold text-text-dark font-nunito">
                For Tutors
              </h2>
              <p className="font-sarabun text-text-mid text-sm">
                สำหรับติวเตอร์
              </p>
            </div>

            {/* Price */}
            <div className="text-center mb-2 py-3 bg-sky-dark/5 rounded-xl">
              <div className="text-4xl font-black text-sky-dark">
                ฿{tutorTotal.toLocaleString()}
              </div>
              <p className="text-text-mid font-semibold">/month &middot; ต่อเดือน</p>
              <p className="text-xs text-text-light mt-1">
                ฿250 per student/month &middot; ต่อนักเรียน/เดือน
              </p>
            </div>

            {/* Seat selector */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-text-dark mb-2 font-nunito text-center">
                Number of students{" "}
                <span className="font-sarabun text-text-mid font-normal">จำนวนนักเรียน</span>
              </label>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setSeatCount(Math.max(5, seatCount - 1))}
                  className="w-12 h-12 rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  -
                </button>
                <div className="text-3xl font-black text-sky-dark w-16 text-center">
                  {seatCount}
                </div>
                <button
                  onClick={() => setSeatCount(seatCount + 1)}
                  className="w-12 h-12 rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-text-light text-center mt-1">
                Minimum 5 students &middot; ขั้นต่ำ 5 คน
              </p>
            </div>

            {/* Free trial badge */}
            <div className="text-center mb-4">
              <span className="inline-block bg-sun/30 text-text-dark font-bold text-sm px-4 py-1 rounded-xl font-nunito">
                7-day free trial &middot; ทดลองฟรี 7 วัน
              </span>
            </div>

            {/* Bullet points */}
            <ul className="space-y-2 mb-6 flex-1">
              {[
                { en: "All subjects for all students", th: "ทุกวิชาสำหรับนักเรียนทุกคน" },
                { en: "Student progress dashboard", th: "แดชบอร์ดติดตามนักเรียน" },
                { en: "Invite codes for easy setup", th: "รหัสเชิญเพื่อตั้งค่าง่าย" },
                { en: "New content monthly", th: "เนื้อหาใหม่ทุกเดือน" },
              ].map((item) => (
                <li key={item.en} className="flex items-start gap-3 text-sm">
                  <span className="text-leaf text-lg">&#10003;</span>
                  <div>
                    <span className="text-text-dark font-semibold">{item.en}</span>
                    <span className="font-sarabun text-text-mid ml-2">{item.th}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handleCheckout("tutor")}
              disabled={loading}
              className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : `Start Free Trial · เริ่มทดลองฟรี`}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Secure payment */}
        <p className="text-center text-xs text-text-light mt-4">
          Secure payment via Stripe &middot; ชำระเงินปลอดภัยผ่าน Stripe
        </p>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link href="/learn" className="text-sky-dark font-semibold text-sm hover:underline">
            &larr; Back to Learning &middot; กลับไปเรียน
          </Link>
        </div>

        {/* ABCs free notice */}
        <div className="bg-sun/30 rounded-xl p-4 mt-6 text-center">
          <p className="text-sm text-text-dark font-semibold">
            ABCs subject is free!
          </p>
          <p className="font-sarabun text-xs text-text-mid">วิชา ABCs เรียนฟรี!</p>
        </div>

        {/* Contact */}
        <div className="text-center mt-6">
          <p className="text-xs text-text-light">
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
