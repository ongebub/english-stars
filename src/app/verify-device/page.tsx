"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getDeviceLabel } from "@/lib/device-fingerprint";

export default function VerifyDevicePage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError("");

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newDigits.every((d) => d)) {
      submitCode(newDigits.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const newDigits = [...digits];
    for (let i = 0; i < text.length; i++) {
      newDigits[i] = text[i];
    }
    setDigits(newDigits);
    if (text.length === 6) {
      submitCode(text);
    } else {
      inputRefs.current[text.length]?.focus();
    }
  }

  async function submitCode(code: string) {
    setLoading(true);
    setError("");

    const device_hash = sessionStorage.getItem("es_pending_device_hash") || "";
    const device_label = getDeviceLabel();

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, device_hash, device_label }),
      });
      const data = await res.json();

      if (data.verified) {
        // Store device ID cookie
        document.cookie = `es_device_id=${device_hash}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
        sessionStorage.removeItem("es_pending_device_hash");
        router.push("/learn");
      } else {
        setError(data.error || "Invalid code");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setError("");

    const device_hash = sessionStorage.getItem("es_pending_device_hash") || "";

    try {
      await fetch("/api/auth/check-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_hash }),
      });
    } catch {
      setError("Could not resend code.");
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
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

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📧</div>
            <h1 className="font-nunito text-xl font-bold text-text-dark mb-1">
              Check your email
            </h1>
            <p className="font-sarabun text-text-mid">
              กรุณาตรวจสอบอีเมลของคุณ
            </p>
            <p className="text-sm text-text-light mt-2">
              We sent a 6-digit code to verify this device.
              <br />
              <span className="font-sarabun">เราส่งรหัส 6 หลักเพื่อยืนยันอุปกรณ์นี้</span>
            </p>
          </div>

          {/* 6-digit input */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-2xl font-black rounded-xl border-2 border-gray-200
                           focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                           text-text-dark transition-colors"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <div className="bg-coral/20 border-2 border-coral rounded-xl p-3 text-sm text-text-dark text-center mb-4 whitespace-pre-line">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center text-text-mid text-sm mb-4">
              Verifying... / กำลังยืนยัน...
            </div>
          )}

          <button
            onClick={resendCode}
            disabled={resendCooldown > 0}
            className="w-full text-sm text-sky-dark font-semibold hover:underline disabled:text-text-light disabled:no-underline"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s / ส่งรหัสใหม่ใน ${resendCooldown} วินาที`
              : "Resend code / ส่งรหัสใหม่"}
          </button>
        </div>
      </div>
    </div>
  );
}
