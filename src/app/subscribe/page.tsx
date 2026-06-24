"use client";

import { useState } from "react";
import Link from "next/link";

function familyPrice(children: number): number {
  if (children <= 1) return 750;
  if (children === 2) return 1000;
  if (children === 3) return 1250;
  return 1500;
}

function schoolPrice(students: number): number {
  if (students <= 35) return students * 250;
  return students * 200;
}

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<"family" | "school">("family");
  const [childCount, setChildCount] = useState(1);
  const [studentCount, setStudentCount] = useState(10);
  const [schoolName, setSchoolName] = useState("");

  const total = plan === "family" ? familyPrice(childCount) : schoolPrice(studentCount);

  async function handleSubscribe() {
    setLoading(true);
    setError("");

    if (plan === "school" && !schoolName.trim()) {
      setError("Please enter your school or center name");
      setLoading(false);
      return;
    }

    try {
      const body = plan === "family"
        ? { plan_type: "family", child_count: childCount }
        : { plan_type: "school", student_count: studentCount, school_name: schoolName.trim() };

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
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🦉</div>
          <h1 className="text-2xl font-extrabold text-text-dark">Subscribe to English Stars</h1>
          <p className="font-sarabun text-text-mid mt-1">สมัครสมาชิก English Stars</p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setPlan("family")}
            className={`rounded-xl p-5 text-center font-bold transition-all border-3 ${
              plan === "family"
                ? "border-sky-dark bg-sky-dark/10 shadow-lg"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-4xl mb-2">👨‍👩‍👧</div>
            <p className="font-nunito text-lg text-text-dark">Family</p>
            <p className="font-sarabun text-sm text-text-mid">ครอบครัว</p>
            <p className="mt-2 text-sky-dark font-black">from ฿750/mo</p>
          </button>
          <button
            onClick={() => setPlan("school")}
            className={`rounded-xl p-5 text-center font-bold transition-all border-3 ${
              plan === "school"
                ? "border-sky-dark bg-sky-dark/10 shadow-lg"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-4xl mb-2">🏫</div>
            <p className="font-nunito text-lg text-text-dark">School / Tutor</p>
            <p className="font-sarabun text-sm text-text-mid">โรงเรียน / ติวเตอร์</p>
            <p className="mt-2 text-sky-dark font-black">from ฿250/student</p>
          </button>
        </div>

        {/* Plan details */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          {plan === "family" ? (
            <>
              <h2 className="text-xl font-bold text-text-dark font-nunito mb-1">
                Family Plan <span className="font-sarabun text-text-mid font-normal">แพ็คเกจครอบครัว</span>
              </h2>
              <p className="text-sm text-text-mid mb-4">Perfect for home learning / เหมาะสำหรับการเรียนที่บ้าน</p>

              {/* Child count */}
              <p className="text-sm font-bold text-text-dark mb-2 font-nunito">
                How many children? <span className="font-sarabun text-text-mid font-normal">จำนวนบุตร</span>
              </p>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setChildCount(n)}
                    className={`flex-1 rounded-xl py-3 font-bold text-lg transition-all ${
                      childCount === n
                        ? "bg-sky-dark text-white shadow-md scale-105"
                        : "bg-gray-100 text-text-mid hover:bg-gray-200"
                    }`}
                  >
                    {n}{n === 4 ? "+" : ""}
                  </button>
                ))}
              </div>

              {/* Pricing tiers */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1 font-nunito">
                {[
                  { n: 1, price: 750 },
                  { n: 2, price: 1000 },
                  { n: 3, price: 1250 },
                  { n: 4, price: 1500 },
                ].map((tier) => (
                  <div
                    key={tier.n}
                    className={`flex justify-between py-1 px-2 rounded ${
                      childCount === tier.n ? "bg-sky-dark/10 font-bold" : ""
                    }`}
                  >
                    <span>{tier.n}{tier.n === 4 ? "+" : ""} child{tier.n > 1 ? "ren" : ""}</span>
                    <span className={childCount === tier.n ? "text-sky-dark" : ""}>
                      ฿{tier.price.toLocaleString()}/month
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-text-dark font-nunito mb-1">
                School/Tutor Plan <span className="font-sarabun text-text-mid font-normal">แพ็คเกจโรงเรียน</span>
              </h2>
              <p className="text-sm text-text-mid mb-4">
                Perfect for classrooms and tutoring centers / เหมาะสำหรับห้องเรียนและสถาบันกวดวิชา
              </p>

              {/* School name */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-text-dark mb-1 font-nunito">
                  School/Center Name <span className="font-sarabun text-text-mid font-normal">ชื่อโรงเรียน</span>
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. ABC Tutoring Center"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-text-dark
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
                />
              </div>

              {/* Student count */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-text-dark mb-1 font-nunito">
                  Number of students <span className="font-sarabun text-text-mid font-normal">จำนวนนักเรียน</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStudentCount(Math.max(5, studentCount - 5))}
                    className="w-12 h-12 rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={studentCount}
                    onChange={(e) => setStudentCount(Math.max(5, parseInt(e.target.value) || 5))}
                    className="flex-1 text-center text-2xl font-black rounded-xl border-2 border-gray-200 py-2
                               focus:border-sky-dark focus:outline-none"
                  />
                  <button
                    onClick={() => setStudentCount(Math.min(200, studentCount + 5))}
                    className="w-12 h-12 rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Pricing info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1 font-nunito">
                <div className="flex justify-between">
                  <span>Rate per student</span>
                  <span className="font-bold">
                    ฿{studentCount <= 35 ? "250" : "200"}/month
                  </span>
                </div>
                {studentCount > 35 && (
                  <p className="text-xs text-leaf font-bold">
                    Volume discount applied! ส่วนลดจำนวนมาก!
                  </p>
                )}
                <div className="flex justify-between font-bold text-sky-dark border-t border-gray-200 pt-1">
                  <span>{studentCount} students</span>
                  <span>฿{total.toLocaleString()}/month</span>
                </div>
              </div>

              <div className="bg-sun/20 rounded-xl p-3 mb-4 text-xs font-nunito">
                <p className="font-bold text-text-dark">Includes:</p>
                <p className="text-text-mid">
                  Unique class join code &middot; Student progress tracking &middot; CSV exports
                </p>
                <p className="font-sarabun text-text-mid mt-1">
                  รวม: รหัสเข้าร่วมชั้นเรียน &middot; ติดตามความก้าวหน้า &middot; ดาวน์โหลดรายงาน
                </p>
              </div>
            </>
          )}

          {/* Total */}
          <div className="text-center mb-4 py-3 bg-sky-dark/5 rounded-xl">
            <div className="text-4xl font-black text-sky-dark">฿{total.toLocaleString()}</div>
            <p className="text-text-mid font-semibold">/month &middot; ต่อเดือน</p>
          </div>

          <ul className="space-y-2 mb-6">
            {[
              { en: "All subjects & modules", th: "ทุกวิชาและโมดูล" },
              { en: "Unlimited quizzes", th: "ทำแบบทดสอบไม่จำกัด" },
              { en: plan === "school" ? "Student progress dashboard" : "Parent gradebook", th: plan === "school" ? "แดชบอร์ดติดตามนักเรียน" : "สมุดพกผู้ปกครอง" },
              { en: "New content monthly", th: "เนื้อหาใหม่ทุกเดือน" },
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
            {loading ? "Loading..." : `Subscribe ฿${total.toLocaleString()}/mo · สมัครเลย`}
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
