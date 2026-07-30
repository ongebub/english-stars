"use client";

import { useState } from "react";

/**
 * Plan naming mapping:
 * - UI "Family" plan  => DB subscriptions.tier = 'individual', plan_type = 'family'
 *   (kept as 'individual' at DB level because the Stripe webhook depends on it)
 * - UI "Tutor" plan   => DB subscriptions.tier = 'tutor', plan_type = 'school'
 */

export type PlanChoice = {
  /** DB-level tier value: 'individual' or 'tutor' */
  tier: "individual" | "tutor";
  /** Only relevant for tutor plan */
  seatCount?: number;
};

interface PlanCardsProps {
  /** Called when user clicks a plan CTA button */
  onSelectPlan: (plan: PlanChoice) => void;
  /** Whether buttons should show a loading state */
  loading?: boolean;
  /** Label override for the CTA buttons (default: "Start Free Trial") */
  ctaLabel?: string;
  ctaLabelThai?: string;
}

export default function PlanCards({
  onSelectPlan,
  loading = false,
  ctaLabel = "Start Free Trial",
  ctaLabelThai = "เริ่มทดลองฟรี",
}: PlanCardsProps) {
  const [seatCount, setSeatCount] = useState(5);
  const tutorTotal = seatCount * 250;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Family (DB: individual) / For Parents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-sky-dark/20 transition-all flex flex-col">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">&#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467;</div>
          <h2 className="text-xl font-bold text-text-dark dark:text-white font-nunito">
            Family Plan
          </h2>
          <p className="font-sarabun text-text-mid dark:text-gray-300 text-sm">
            สำหรับผู้ปกครอง
          </p>
        </div>

        {/* Price */}
        <div className="text-center mb-4 py-3 bg-sky-dark/5 dark:bg-sky-dark/10 rounded-xl">
          <div className="text-4xl font-black text-sky-dark">&#3647;750</div>
          <p className="text-text-mid dark:text-gray-300 font-semibold">/month &middot; ต่อเดือน</p>
        </div>

        {/* Free trial badge */}
        <div className="text-center mb-4">
          <span className="inline-block bg-sun/30 text-text-dark dark:text-white font-bold text-sm px-4 py-1 rounded-xl font-nunito">
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
                <span className="text-text-dark dark:text-white font-semibold">{item.en}</span>
                <span className="font-sarabun text-text-mid dark:text-gray-300 ml-2">{item.th}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onSelectPlan({ tier: "individual" })}
          disabled={loading}
          className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : `${ctaLabel} · ${ctaLabelThai}`}
        </button>
      </div>

      {/* Tutor */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-sky-dark/30 transition-all flex flex-col relative">
        {/* Popular badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-sky-dark text-white text-xs font-bold px-4 py-1 rounded-xl font-nunito">
            Popular for tutors
          </span>
        </div>

        <div className="text-center mb-4 mt-2">
          <div className="text-4xl mb-2">&#x1F3EB;</div>
          <h2 className="text-xl font-bold text-text-dark dark:text-white font-nunito">
            Tutor Plan
          </h2>
          <p className="font-sarabun text-text-mid dark:text-gray-300 text-sm">
            สำหรับติวเตอร์
          </p>
        </div>

        {/* Price */}
        <div className="text-center mb-2 py-3 bg-sky-dark/5 dark:bg-sky-dark/10 rounded-xl">
          <div className="text-4xl font-black text-sky-dark">
            &#3647;{tutorTotal.toLocaleString()}
          </div>
          <p className="text-text-mid dark:text-gray-300 font-semibold">/month &middot; ต่อเดือน</p>
          <p className="text-xs text-text-light dark:text-gray-400 mt-1">
            &#3647;250 per student/month &middot; ต่อนักเรียน/เดือน
          </p>
        </div>

        {/* Seat selector */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-text-dark dark:text-white mb-2 font-nunito text-center">
            Number of students{" "}
            <span className="font-sarabun text-text-mid dark:text-gray-300 font-normal">จำนวนนักเรียน</span>
          </label>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setSeatCount(Math.max(5, seatCount - 1))}
              className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-text-dark dark:text-white"
            >
              -
            </button>
            <div className="text-3xl font-black text-sky-dark w-16 text-center">
              {seatCount}
            </div>
            <button
              onClick={() => setSeatCount(seatCount + 1)}
              className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-text-dark dark:text-white"
            >
              +
            </button>
          </div>
          <p className="text-xs text-text-light dark:text-gray-400 text-center mt-1">
            Minimum 5 students &middot; ขั้นต่ำ 5 คน
          </p>
        </div>

        {/* Free trial badge */}
        <div className="text-center mb-4">
          <span className="inline-block bg-sun/30 text-text-dark dark:text-white font-bold text-sm px-4 py-1 rounded-xl font-nunito">
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
                <span className="text-text-dark dark:text-white font-semibold">{item.en}</span>
                <span className="font-sarabun text-text-mid dark:text-gray-300 ml-2">{item.th}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onSelectPlan({ tier: "tutor", seatCount })}
          disabled={loading}
          className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : `${ctaLabel} · ${ctaLabelThai}`}
        </button>
      </div>
    </div>
  );
}
