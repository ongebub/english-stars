"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getActiveChild, clearActiveChild } from "@/lib/active-child";
import { getSchoolSession, clearSchoolSession } from "@/lib/school-session";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const SESSION_KEY = "english_stars_session_id";

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, id);
}

export function clearSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function ChildSessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [kicked, setKicked] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heartbeat = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    try {
      const res = await fetch("/api/child-session/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (data.kicked) {
        setKicked(true);
        // Clean up
        clearSessionId();
        clearActiveChild();
        // Redirect after showing message
        countdownRef.current = setTimeout(() => {
          const school = getSchoolSession();
          if (school) {
            clearSchoolSession();
            router.push("/join");
          } else {
            router.push("/select-profile");
          }
        }, 4000);
      }
    } catch {
      // Network error — skip this heartbeat
    }
  }, [router]);

  useEffect(() => {
    // Only run heartbeat if there's an active session
    const sessionId = getSessionId();
    if (!sessionId) return;

    // Initial heartbeat
    heartbeat();

    intervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [heartbeat]);

  if (kicked) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="font-nunito text-xl font-bold text-text-dark mb-2">
            Signed in on another device
          </h2>
          <p className="font-sarabun text-text-mid mb-4">
            โปรไฟล์นี้กำลังถูกใช้งานบนอุปกรณ์อื่น
          </p>
          <p className="text-sm text-text-light">
            Redirecting... / กำลังเปลี่ยนหน้า...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
