"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  code: string;
  userEmail?: string;
}

export default function JoinClient({ code, userEmail }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"confirm" | "profile">("confirm");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // Profile form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email] = useState(userEmail || "");
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleJoin() {
    setJoining(true);
    setError("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join class");
        return;
      }
      // Move to profile collection step
      setStep("profile");
    } catch {
      setError("Something went wrong. กรุณาลองใหม่");
    } finally {
      setJoining(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name. กรุณากรอกชื่อและนามสกุล");
      return;
    }
    setSavingProfile(true);
    setError("");
    try {
      const res = await fetch("/api/tutor/update-student-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not save profile");
        return;
      }
      router.push("/learn");
    } catch {
      setError("Something went wrong. กรุณาลองใหม่");
    } finally {
      setSavingProfile(false);
    }
  }

  if (step === "profile") {
    return (
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="text-center mb-2">
          <p className="text-lg font-bold text-text-dark font-nunito">
            Almost there! Tell us your name
          </p>
          <p className="font-sarabun text-text-mid text-sm">
            อีกนิดเดียว! บอกชื่อของคุณ
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-text-dark mb-1 font-nunito">
            First Name <span className="font-sarabun text-text-mid font-normal">ชื่อ</span>
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name / ชื่อ"
            className="w-full text-lg font-bold rounded-xl border-2 border-gray-200 px-4 py-3 text-text-dark
                       focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-text-dark mb-1 font-nunito">
            Last Name <span className="font-sarabun text-text-mid font-normal">นามสกุล</span>
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name / นามสกุล"
            className="w-full text-lg font-bold rounded-xl border-2 border-gray-200 px-4 py-3 text-text-dark
                       focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-text-dark mb-1 font-nunito">
            Email <span className="font-sarabun text-text-mid font-normal">อีเมล</span>
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full text-lg rounded-xl border-2 border-gray-100 px-4 py-3 text-text-mid
                       bg-gray-50 cursor-not-allowed"
          />
          <p className="text-xs text-text-light mt-1 font-sarabun">
            This is your login email / อีเมลที่ใช้เข้าสู่ระบบ
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
        >
          {savingProfile ? "Saving... / กำลังบันทึก..." : "Start Learning! / เริ่มเรียน! 🎉"}
        </button>
      </form>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleJoin}
        disabled={joining}
        className="w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-50"
      >
        {joining ? "Joining... / กำลังเข้าร่วม..." : "Join Class / เข้าร่วมชั้นเรียน"}
      </button>
    </div>
  );
}
