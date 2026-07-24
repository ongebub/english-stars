"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ─── Constants ─────────────────────────────────────────── */

const TOTAL_STEPS = 9;
const LS_KEY = "ea_tutorial_state";
const TUTORIAL_SUBJECT = "animals"; // fallback subject for steps 4-8

interface TutorialStep {
  id: number;
  title?: string;
  body: string;
  /** CSS selector for the element to spotlight; null = centered modal */
  selector: string | null;
  /** Page the step lives on; null = current page */
  page: string | null;
  /** Which button labels to show */
  nextLabel: string;
  /** Whether to auto-skip if selector not found */
  autoSkip?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to English Allstars!",
    body: "Hi! I'm Ollie, your English learning friend. I'll show you around in about 30 seconds. Ready?",
    selector: null,
    page: "/learn",
    nextLabel: "Let's go!",
  },
  {
    id: 2,
    body: "These are your Subjects. Each one teaches something new \u2014 ABCs, Numbers, Animals, Colors, and lots more. Tap any subject to start learning!",
    selector: "[data-tutorial='subject-grid']",
    page: "/learn",
    nextLabel: "Next",
  },
  {
    id: 3,
    body: "You can pick your grade here to see subjects made just for you.",
    selector: "[data-tutorial='grade-filter']",
    page: "/learn",
    nextLabel: "Next",
    autoSkip: true,
  },
  {
    id: 4,
    body: "Every subject has four fun ways to learn: Flashcards, Quiz, Picture Quiz, and a Storybook. Let's look at each one!",
    selector: "[data-tutorial='module-grid']",
    page: `/learn/${TUTORIAL_SUBJECT}`,
    nextLabel: "Next",
  },
  {
    id: 5,
    body: "Flashcards show you a word with a picture. Tap the card to hear how it sounds. Swipe or tap to see the next card. Great for learning new words!",
    selector: "[data-tutorial='tile-flashcards']",
    page: `/learn/${TUTORIAL_SUBJECT}`,
    nextLabel: "Next",
  },
  {
    id: 6,
    body: "Quizzes test what you learned! Read the question, then tap the right answer. Ten questions each time \u2014 do them all and earn a trophy!",
    selector: "[data-tutorial='tile-quiz']",
    page: `/learn/${TUTORIAL_SUBJECT}`,
    nextLabel: "Next",
  },
  {
    id: 7,
    body: "Picture Quizzes are like regular quizzes but with pictures for answers. Great for younger learners!",
    selector: "[data-tutorial='tile-picture-quiz']",
    page: `/learn/${TUTORIAL_SUBJECT}`,
    nextLabel: "Next",
    autoSkip: true,
  },
  {
    id: 8,
    body: "Every subject has a fun read-along story! Sit back and follow along as I read to you. Great for practice and just for fun!",
    selector: "[data-tutorial='tile-ebook']",
    page: `/learn/${TUTORIAL_SUBJECT}`,
    nextLabel: "Next",
    autoSkip: true,
  },
  {
    id: 9,
    title: "You're all set!",
    body: "Now you know how English Allstars works. Pick any subject and start learning! Remember, you can restart this tour anytime from the Dashboard.",
    selector: null,
    page: null,
    nextLabel: "Start learning!",
  },
];

/* ─── localStorage helpers ──────────────────────────────── */

interface LocalState {
  lastStep: number;
  completedAt: string | null;
  skippedAt: string | null;
}

function getLocalState(): LocalState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalState;
  } catch {
    return null;
  }
}

function setLocalState(s: LocalState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch { /* quota */ }
}

function clearLocalState() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch { /* */ }
}

/* ─── Component ─────────────────────────────────────────── */

export default function TutorialOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; pointerDir: "up" | "down" } | null>(null);
  const [navigating, setNavigating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const initDone = useRef(false);

  /* ── Init: check if tutorial should show ── */
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        // Check for localStorage state to migrate
        const local = getLocalState();
        if (local && !local.completedAt && !local.skippedAt) {
          // Migrate localStorage to DB
          await supabase.from("user_tutorial_state").upsert({
            user_id: user.id,
            last_step: local.lastStep,
            updated_at: new Date().toISOString(),
          });
          clearLocalState();
        }

        // Check DB state
        const { data } = await supabase
          .from("user_tutorial_state")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data?.completed_at || data?.skipped_at) {
          // Tutorial already done
          return;
        }

        if (data?.last_step && data.last_step > 0) {
          setStep(data.last_step);
        }

        setVisible(true);
      } else {
        // Anon user — use localStorage
        const local = getLocalState();
        if (local?.completedAt || local?.skippedAt) return;
        if (local?.lastStep && local.lastStep > 0) {
          setStep(local.lastStep);
        }
        setVisible(true);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Persist step progress ── */
  const persistStep = useCallback(
    async (stepNum: number) => {
      if (userId) {
        await supabase.from("user_tutorial_state").upsert({
          user_id: userId,
          last_step: stepNum,
          updated_at: new Date().toISOString(),
        });
      } else {
        setLocalState({ lastStep: stepNum, completedAt: null, skippedAt: null });
      }
    },
    [userId, supabase]
  );

  /* ── Complete / Skip ── */
  const finishTutorial = useCallback(
    async (mode: "complete" | "skip") => {
      const now = new Date().toISOString();
      if (userId) {
        await supabase.from("user_tutorial_state").upsert({
          user_id: userId,
          last_step: step,
          ...(mode === "complete" ? { completed_at: now } : { skipped_at: now }),
          updated_at: now,
        });
      } else {
        setLocalState({
          lastStep: step,
          ...(mode === "complete" ? { completedAt: now, skippedAt: null } : { completedAt: null, skippedAt: now }),
        });
      }
      setVisible(false);
      // Navigate back to /learn if we're on a subject page
      if (pathname !== "/learn") {
        router.push("/learn");
      }
    },
    [userId, supabase, step, pathname, router]
  );

  /* ── Spotlight positioning ── */
  const positionSpotlight = useCallback(() => {
    const currentStep = STEPS[step - 1];
    if (!currentStep?.selector) {
      setSpotlightRect(null);
      setTooltipPos(null);
      return;
    }

    const el = document.querySelector(currentStep.selector);
    if (!el) {
      // Auto-skip if element not found
      if (currentStep.autoSkip) {
        setStep((s) => Math.min(s + 1, TOTAL_STEPS));
        return;
      }
      setSpotlightRect(null);
      setTooltipPos(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);

    // Calculate tooltip position
    const padding = 16;
    const tooltipWidth = Math.min(340, window.innerWidth - 32);
    const viewportH = window.innerHeight;

    let top: number;
    let pointerDir: "up" | "down";

    // Prefer tooltip below the spotlight
    if (rect.bottom + padding + 180 < viewportH) {
      top = rect.bottom + padding;
      pointerDir = "up";
    } else {
      top = rect.top - padding - 180;
      pointerDir = "down";
    }

    // Clamp
    top = Math.max(16, Math.min(top, viewportH - 200));

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setTooltipPos({ top, left, pointerDir });
  }, [step]);

  /* ── Reposition on step change / resize / scroll ── */
  useEffect(() => {
    if (!visible) return;

    const currentStep = STEPS[step - 1];

    // Handle navigation for steps that need a different page
    if (currentStep?.page && pathname !== currentStep.page) {
      setNavigating(true);
      router.push(currentStep.page);
      return;
    }

    setNavigating(false);

    // Small delay to let DOM render after navigation
    const timer = setTimeout(() => {
      positionSpotlight();
    }, 300);

    const handleResize = () => positionSpotlight();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [visible, step, pathname, router, positionSpotlight]);

  /* ── After navigation, re-check positioning ── */
  useEffect(() => {
    if (!visible || !navigating) return;
    const currentStep = STEPS[step - 1];
    if (currentStep?.page && pathname === currentStep.page) {
      setNavigating(false);
      const timer = setTimeout(() => positionSpotlight(), 500);
      return () => clearTimeout(timer);
    }
  }, [pathname, visible, navigating, step, positionSpotlight]);

  /* ── Keyboard: Escape to skip ── */
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishTutorial("skip");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, finishTutorial]);

  /* ── Focus trap ── */
  useEffect(() => {
    if (!visible || !tooltipRef.current) return;
    const focusable = tooltipRef.current.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [visible, step, tooltipPos]);

  /* ── Step handlers ── */
  const goNext = useCallback(async () => {
    if (step >= TOTAL_STEPS) {
      await finishTutorial("complete");
      return;
    }
    const next = step + 1;
    setStep(next);
    await persistStep(next);
  }, [step, finishTutorial, persistStep]);

  const goSkip = useCallback(() => {
    finishTutorial("skip");
  }, [finishTutorial]);

  /* ── Don't render if not visible ── */
  if (!visible) return null;

  const currentStep = STEPS[step - 1];
  const isModal = !currentStep?.selector;

  /* ── SVG mask for spotlight cutout ── */
  const renderBackdrop = () => {
    if (!spotlightRect || isModal) {
      return (
        <div
          className="fixed inset-0 z-[9998] transition-opacity duration-300"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={goSkip}
        />
      );
    }

    const pad = 8;
    const r = 12;
    const x = spotlightRect.left - pad;
    const y = spotlightRect.top - pad;
    const w = spotlightRect.width + pad * 2;
    const h = spotlightRect.height + pad * 2;

    return (
      <div className="fixed inset-0 z-[9998]" onClick={goSkip}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <mask id="tutorial-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="black" />
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#tutorial-spotlight-mask)"
          />
        </svg>
        {/* Spotlight border glow */}
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: x,
            top: y,
            width: w,
            height: h,
            boxShadow: "0 0 0 3px rgba(79,195,247,0.6), 0 0 20px rgba(79,195,247,0.3)",
          }}
        />
      </div>
    );
  };

  /* ── Tooltip / Modal ── */
  const renderTooltip = () => {
    if (navigating) return null;

    const content = (
      <div
        ref={tooltipRef}
        role="dialog"
        aria-labelledby={currentStep.title ? "tutorial-title" : undefined}
        aria-describedby="tutorial-body"
        className="relative rounded-2xl p-5 shadow-xl animate-fadeIn"
        style={{
          backgroundColor: "#FFF8ED",
          color: "#3E2723",
          maxWidth: 360,
          width: "calc(100vw - 32px)",
          minWidth: 280,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold font-nunito opacity-50">
            {step} / {TOTAL_STEPS}
          </span>
          {/* Progress dots */}
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i + 1 === step ? 16 : 6,
                  height: 6,
                  backgroundColor: i + 1 <= step ? "#0288D1" : "#D7CCC8",
                }}
              />
            ))}
          </div>
        </div>

        {currentStep.title && (
          <h2
            id="tutorial-title"
            className="font-fredoka text-xl font-bold mb-1"
            style={{ color: "#0288D1" }}
          >
            {currentStep.title}
          </h2>
        )}

        <p id="tutorial-body" className="font-nunito text-sm leading-relaxed mb-4">
          {currentStep.body}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={goSkip}
            className="font-nunito text-xs font-semibold underline opacity-60 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
            style={{ color: "#3E2723" }}
          >
            Skip tour
          </button>

          <button
            onClick={goNext}
            className="font-nunito font-bold text-sm px-5 py-2 rounded-xl text-white transition-all
                       hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-dark"
            style={{ backgroundColor: "#0288D1" }}
          >
            {currentStep.nextLabel}
          </button>
        </div>
      </div>
    );

    // Centered modal
    if (isModal) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {content}
        </div>
      );
    }

    // Positioned tooltip with pointer
    if (!tooltipPos) return null;

    return (
      <div
        className="fixed z-[9999]"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Pointer triangle */}
        {tooltipPos.pointerDir === "up" && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderBottom: "10px solid #FFF8ED",
            }}
          />
        )}
        {content}
        {tooltipPos.pointerDir === "down" && (
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "10px solid #FFF8ED",
            }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {renderBackdrop()}
      {renderTooltip()}
    </>
  );
}
