"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setSchoolSession } from "@/lib/school-session";
import { getDeviceFingerprint, getDeviceLabel } from "@/lib/device-fingerprint";
import { setSessionId } from "@/components/ChildSessionGuard";
import Link from "next/link";

const AVATAR_EMOJIS = ["🧒", "👧", "👦", "🧒🏻", "👧🏽", "👦🏾", "🦸", "🧑‍🎓", "🐻", "🐰", "🦊", "🐼"];

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-sky-dark to-[#26C6DA] flex items-center justify-center">
        <div className="text-7xl animate-bounce">🏫</div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"code" | "name">("code");
  const [code, setCode] = useState("");
  const [childName, setChildName] = useState("");
  const [avatar, setAvatar] = useState("🧒");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill code from URL
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
      setStep("name");
    }
  }, [searchParams]);

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError("Please enter your class code. กรุณาใส่รหัสห้องเรียน");
      return;
    }
    setError("");
    setStep("name");
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/school/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          child_name: childName.trim(),
          avatar_emoji: avatar,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not join. Please try again.");
        return;
      }

      // Save session to localStorage
      setSchoolSession({
        child_id: data.child_id,
        child_name: data.child_name,
        school_name: data.school_name,
        join_code: data.join_code,
      });

      // Register child session for device limiting
      try {
        const device_hash = await getDeviceFingerprint();
        const device_label = getDeviceLabel();
        const sessionRes = await fetch("/api/child-session/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            child_id: data.child_id,
            device_hash,
            device_label,
            is_school: true,
          }),
        });
        const sessionData = await sessionRes.json();
        if (sessionData.session_id) setSessionId(sessionData.session_id);
      } catch {
        // Session registration failed — still allow access
      }

      router.push("/learn");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-dark to-[#26C6DA] flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🏫</div>
          <h1 className="text-3xl font-black text-white font-nunito">
            Join Class
          </h1>
          <p className="text-white/90 font-sarabun text-xl mt-1">
            เข้าร่วมชั้นเรียน
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {step === "code" ? (
            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <div>
                <label className="block text-center text-lg font-bold text-text-dark mb-3 font-nunito">
                  Enter your class code
                  <br />
                  <span className="font-sarabun text-text-mid font-normal">
                    ใส่รหัสห้องเรียน
                  </span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full text-center text-4xl font-black tracking-[0.3em] rounded-xl
                             border-3 border-sky-dark px-4 py-5 text-text-dark
                             focus:outline-none focus:ring-4 focus:ring-sky-dark/30
                             placeholder:text-gray-300 placeholder:tracking-[0.3em]"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-coral/20 border-2 border-coral rounded-xl p-3 text-sm text-text-dark text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-leaf text-white font-bold text-xl py-4 rounded-xl
                           hover:bg-leaf-dark transition-colors shadow-lg min-h-[56px]"
              >
                <span className="font-nunito">Next</span>{" "}
                <span className="font-sarabun">ถัดไป</span> →
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div className="text-center">
                <span className="inline-block bg-sky-dark/10 text-sky-dark font-mono font-bold text-lg px-4 py-1 rounded-lg">
                  {code}
                </span>
              </div>

              <div>
                <label className="block text-center text-lg font-bold text-text-dark mb-2 font-nunito">
                  What is your name?
                  <br />
                  <span className="font-sarabun text-text-mid font-normal">
                    ชื่อของเธอคืออะไร?
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Your name / ชื่อเล่น"
                  className="w-full text-center text-2xl font-bold rounded-xl
                             border-2 border-gray-200 px-4 py-4 text-text-dark
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
                  autoFocus
                />
              </div>

              {/* Avatar picker */}
              <div>
                <p className="text-center text-sm font-bold text-text-dark mb-2 font-nunito">
                  Pick your avatar <span className="font-sarabun text-text-mid font-normal">เลือกอวตาร</span>
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`text-3xl p-2 rounded-xl min-h-[48px] transition-all ${
                        avatar === emoji
                          ? "bg-sun border-2 border-sun-dark scale-110 shadow-md"
                          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-coral/20 border-2 border-coral rounded-xl p-3 text-sm text-text-dark text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-leaf text-white font-bold text-xl py-4 rounded-xl
                           hover:bg-leaf-dark transition-colors shadow-lg disabled:opacity-50 min-h-[56px]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  <>
                    <span className="font-nunito">Join!</span>{" "}
                    <span className="font-sarabun">เข้าร่วม!</span> 🎉
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep("code"); setError(""); }}
                className="w-full text-sky-dark text-sm font-semibold hover:underline"
              >
                ← Change code / เปลี่ยนรหัส
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="text-white/80 text-sm hover:underline">
            Parent login / ผู้ปกครองเข้าสู่ระบบ →
          </Link>
        </div>
      </div>
    </div>
  );
}
