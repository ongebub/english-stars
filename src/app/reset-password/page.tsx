"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.\nรหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.\nรหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("Could not update password. Please try again.\nไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/learn"), 2000);
    } catch {
      setError("Something went wrong. Please try again.\nเกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="English Allstars"
            width={160}
            height={160}
            priority
            className="mx-auto mb-4"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="font-nunito text-xl font-bold text-text-dark">
              Set New Password
            </h1>
            <p className="font-sarabun text-text-mid">
              ตั้งรหัสผ่านใหม่
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="bg-leaf/20 border-2 border-leaf rounded-xl p-4 text-sm text-text-dark mb-4">
                Password updated successfully! Redirecting...
                <br />
                <span className="font-sarabun">เปลี่ยนรหัสผ่านสำเร็จ! กำลังเปลี่ยนหน้า...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="block text-sm font-bold text-text-dark mb-1">
                  <span className="font-nunito">New Password</span>{" "}
                  <span className="font-sarabun text-text-mid">รหัสผ่านใหม่</span>
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 min-h-[48px] text-text-dark
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                             transition-colors"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-bold text-text-dark mb-1">
                  <span className="font-nunito">Confirm Password</span>{" "}
                  <span className="font-sarabun text-text-mid">ยืนยันรหัสผ่าน</span>
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 min-h-[48px] text-text-dark
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                             transition-colors"
                />
              </div>

              {error && (
                <div className="bg-coral/20 border-2 border-coral rounded-xl p-4 text-sm text-text-dark whitespace-pre-line">
                  {error}
                </div>
              )}

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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating...
                  </span>
                ) : (
                  <span>
                    <span className="font-nunito">Update Password</span>{" "}
                    <span className="font-sarabun">อัปเดตรหัสผ่าน</span>
                  </span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
