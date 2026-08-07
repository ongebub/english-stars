"use client";
import { useState, useEffect } from "react";

// Key used to track when the user last dismissed the install banner
const DISMISSED_KEY = "install-dismissed-at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Detect iOS Safari (no beforeinstallprompt support)
function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // Safari on iOS does not include "CriOS" or "FxiOS"
  const isSafariBrowser = /safari/i.test(ua) && !/crios|fxios|opios|chrome/i.test(ua);
  return isIOS && isSafariBrowser;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Export for use in account/settings pages */
export function getInstallState(): "available" | "ios" | "standalone" | "unavailable" {
  if (typeof window === "undefined") return "unavailable";
  if (window.matchMedia("(display-mode: standalone)").matches) return "standalone";
  // We store the deferred prompt on window so external callers can check
  if ((window as { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt) return "available";
  if (isIOSSafari()) return "ios";
  return "unavailable";
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false); // for slide-up animation

  useEffect(() => {
    // Already running as installed PWA — nothing to show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Already dismissed recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_TTL_MS) return;

    // iOS Safari: no beforeinstallprompt, show manual instructions
    if (isIOSSafari()) {
      setIsIOS(true);
      setShowBanner(true);
      // Animate in after a short delay so the page can settle
      setTimeout(() => setVisible(true), 600);
      return;
    }

    // Android / Chrome: listen for the deferred install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      // Store on window so getInstallState() can see it
      (window as { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setShowBanner(true);
      setTimeout(() => setVisible(true), 600);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
    // Wait for animation before unmounting
    setTimeout(() => setShowBanner(false), 350);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
    delete (window as { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt;
  }

  if (!showBanner) return null;

  return (
    <div
      role="banner"
      aria-label="ติดตั้งแอป"
      className={[
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-sky-dark text-white rounded-t-2xl shadow-xl p-4",
        "transition-transform duration-350 ease-out",
        visible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
    >
      <div className="mx-auto max-w-lg flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">📲</div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="font-sarabun text-sm leading-snug">
            ติดตั้ง English Allstars ไว้บนหน้าจอโฮม เปิดใช้ได้เร็วขึ้น
          </p>

          {isIOS ? (
            // iOS manual instructions
            <p className="font-sarabun text-xs text-white/80 mt-1">
              แตะ{" "}
              <span aria-label="share icon" className="inline-block align-middle">
                {/* Safari share icon approximation */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline w-4 h-4"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>{" "}
              แล้วเลือก <strong>&apos;เพิ่มไปยังหน้าจอโฮม&apos;</strong>
            </p>
          ) : (
            // Android install button
            <button
              onClick={handleInstall}
              className="mt-2 inline-block rounded-lg bg-white text-sky-dark font-nunito text-sm font-bold px-4 py-1.5 hover:bg-white/90 active:scale-95 transition-transform"
            >
              ติดตั้ง
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="ปิด"
          className="flex-shrink-0 text-white/70 hover:text-white text-xl leading-none p-1 -mr-1 -mt-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
