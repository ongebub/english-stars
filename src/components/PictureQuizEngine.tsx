"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PictureQuizQuestion } from "@/lib/types";

interface PictureQuizEngineProps {
  questions: PictureQuizQuestion[];
  subjectId: string;
  subjectSlug: string;
  subjectTitle: string;
  subjectEmoji: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(pool: PictureQuizQuestion[], n: number): PictureQuizQuestion[] {
  return shuffle(pool).slice(0, n).map((q) => ({ ...q, options: shuffle(q.options) }));
}

function starCount(score: number, total: number): number {
  const pct = score / total;
  if (pct >= 0.9) return 3;
  if (pct >= 0.7) return 2;
  return 1;
}

const CONFETTI = ["🎉", "⭐", "🌟", "✨", "🎊", "💫", "🥳", "🦉"];
function ConfettiPiece({ index }: { index: number }) {
  return (
    <span
      className="pointer-events-none absolute text-2xl opacity-0 animate-confetti"
      style={{
        left: `${(index * 37 + 13) % 100}%`,
        top: "-8%",
        animationDelay: `${(index * 0.3 % 2).toFixed(1)}s`,
        animationDuration: `${(2 + index % 3).toFixed(1)}s`,
      }}
    >
      {CONFETTI[index % CONFETTI.length]}
    </span>
  );
}

type Phase = "ready" | "playing" | "results";

export default function PictureQuizEngine({
  questions,
  subjectId,
  subjectSlug,
  subjectTitle,
  subjectEmoji,
}: PictureQuizEngineProps) {
  const QUIZ_SIZE = Math.min(10, questions.length);

  const [phase, setPhase] = useState<Phase>("ready");
  const [selectedQuestions, setSelectedQuestions] = useState<PictureQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  const currentQuestion = selectedQuestions[currentIndex] ?? null;

  const startQuiz = useCallback(() => {
    setSelectedQuestions(pickQuestions(questions, QUIZ_SIZE));
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setSaved(false);
    setFeedbackText(null);
    setPhase("playing");
  }, [questions, QUIZ_SIZE]);

  const playAudio = useCallback((url: string | null) => {
    if (!url) return;
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.play().catch(() => {});
  }, []);

  // Auto-play audio when question loads
  useEffect(() => {
    if (phase === "playing" && currentQuestion?.audio_url) {
      const timer = setTimeout(() => playAudio(currentQuestion.audio_url), 300);
      return () => clearTimeout(timer);
    }
  }, [phase, currentIndex, currentQuestion?.audio_url, playAudio]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (selectedOption !== null || !currentQuestion) return;
      const correct = currentQuestion.options[optionIndex].is_correct;
      setSelectedOption(optionIndex);

      if (correct) {
        setScore((prev) => prev + 1);
        setFeedbackText("เก่งมาก!");
      } else {
        setFeedbackText(null);
      }

      advanceTimerRef.current = setTimeout(() => {
        if (currentIndex + 1 < QUIZ_SIZE) {
          setCurrentIndex((p) => p + 1);
          setSelectedOption(null);
          setFeedbackText(null);
        } else {
          setPhase("results");
        }
      }, 1500);
    },
    [selectedOption, currentQuestion, currentIndex, QUIZ_SIZE]
  );

  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    []
  );

  // Save attempt on results
  useEffect(() => {
    if (phase !== "results" || saved) return;
    async function saveAttempt() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("picture_quiz_attempts").insert({
          child_id: user.id,
          subject_id: subjectId,
          score,
          total: QUIZ_SIZE,
          completed_at: new Date().toISOString(),
        });
        setSaved(true);
      } catch {
        /* silent */
      }
    }
    saveAttempt();
  }, [phase, saved, subjectId, score, QUIZ_SIZE]);

  const stars = useMemo(() => starCount(score, QUIZ_SIZE), [score, QUIZ_SIZE]);
  const isPerfect = score === QUIZ_SIZE;

  /* ── READY PHASE ── */
  if (phase === "ready") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <span className="text-8xl animate-bounce mb-6">{subjectEmoji}</span>
        <h1 className="font-nunito text-3xl font-black text-text-dark text-center">
          {subjectTitle}
        </h1>
        <h2 className="font-nunito text-xl font-bold text-coral mt-2">
          Picture Quiz <span className="font-sarabun text-lg">แบบทดสอบรูปภาพ</span>
        </h2>
        <p className="mt-4 text-text-mid text-center">
          Tap the correct picture! / <span className="font-sarabun">แตะรูปภาพที่ถูกต้อง!</span>
        </p>
        <p className="mt-2 text-text-light text-sm">{QUIZ_SIZE} questions</p>
        <button
          onClick={startQuiz}
          className="mt-8 min-h-[56px] rounded-2xl bg-coral px-10 py-4 font-nunito text-lg font-bold text-white shadow-lg active:scale-95 transition-transform"
        >
          START / <span className="font-sarabun">เริ่ม</span>
        </button>
        <Link
          href={`/learn/${subjectSlug}`}
          className="mt-4 min-h-[48px] flex items-center rounded-xl bg-sky-dark px-6 py-3 font-nunito text-sm font-bold text-white"
        >
          ← Back / <span className="font-sarabun ml-1">กลับ</span>
        </Link>
      </div>
    );
  }

  /* ── PLAYING PHASE ── */
  if (phase === "playing" && currentQuestion) {
    const progress = ((currentIndex + 1) / QUIZ_SIZE) * 100;
    const correctIndex = currentQuestion.options.findIndex((o) => o.is_correct);
    const optionCount = currentQuestion.options.length;

    // Grid layout based on option count
    let gridClass = "grid-cols-2"; // default for 2, 4, 5
    if (optionCount === 3) gridClass = "grid-cols-3";

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white" key={currentIndex}>
        {/* Top bar */}
        <div className="flex-shrink-0 px-4 pb-2" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          <div className="flex items-center justify-between mb-2">
            <Link
              href={`/learn/${subjectSlug}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-gray-600 active:scale-95 transition-transform"
            >
              <span className="text-lg font-bold">✕</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-nunito text-sm font-bold text-text-dark">
                {currentIndex + 1}/{QUIZ_SIZE}
              </span>
              <span className="font-nunito text-sm font-bold text-leaf">✅ {score}</span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-coral to-sun transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question area */}
        <div className="flex-shrink-0 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            {currentQuestion.audio_url && (
              <button
                onClick={() => playAudio(currentQuestion.audio_url)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white text-lg active:scale-90"
              >
                🔊
              </button>
            )}
          </div>
          <h2 className="font-nunito text-2xl font-extrabold text-text-dark text-center leading-snug mt-2">
            {currentQuestion.question_en}
          </h2>
          <p className="font-sarabun text-sm text-text-mid text-center mt-1">
            {currentQuestion.question_th}
          </p>
        </div>

        {/* Feedback popup */}
        {feedbackText && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <div className="rounded-2xl bg-leaf px-6 py-3 shadow-xl animate-popIn">
              <span className="font-nunito text-xl font-bold text-white">{feedbackText}</span>
            </div>
          </div>
        )}

        {/* Answer grid */}
        <div className="flex-1 px-4 pb-4 min-h-0">
          <div className={`grid ${gridClass} gap-3 h-full`}>
            {currentQuestion.options.map((option, idx) => {
              let borderClass = "border-2 border-gray-200";
              let overlayEl = null;

              if (selectedOption !== null) {
                if (idx === correctIndex) {
                  borderClass = "border-4 border-leaf";
                  overlayEl = (
                    <div className="absolute inset-0 flex items-center justify-center bg-leaf/20 rounded-2xl">
                      <span className="text-4xl">✅</span>
                    </div>
                  );
                } else if (idx === selectedOption && !option.is_correct) {
                  borderClass = "border-4 border-coral";
                  overlayEl = (
                    <div className="absolute inset-0 flex items-center justify-center bg-coral/20 rounded-2xl">
                      <span className="text-4xl">❌</span>
                    </div>
                  );
                } else {
                  borderClass = "border-2 border-gray-100 opacity-40";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={selectedOption !== null}
                  className={`relative rounded-2xl overflow-hidden ${borderClass} transition-all duration-200 ${
                    selectedOption === null ? "active:scale-95 hover:border-coral" : ""
                  }`}
                  style={{ minHeight: "120px" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.image_url}
                    alt=""
                    className="w-full h-full object-contain p-2"
                    loading="eager"
                  />
                  {option.text && (
                    <span className="absolute bottom-1 left-0 right-0 text-center font-nunito text-lg font-bold text-text-dark bg-white/80 py-1">
                      {option.text}
                    </span>
                  )}
                  {overlayEl}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── RESULTS PHASE ── */
  if (phase === "results") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 overflow-hidden">
        {/* Confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-7xl animate-bounce">
            {isPerfect ? "🏆" : stars === 3 ? "🌟" : stars === 2 ? "👏" : "💪"}
          </div>

          <h1 className="font-nunito mt-4 text-3xl font-black text-text-dark text-center">
            {score} out of {QUIZ_SIZE}!
          </h1>
          <p className="font-sarabun text-lg text-text-mid">
            คุณได้ {score} จาก {QUIZ_SIZE}!
          </p>

          {/* Stars */}
          <div className="mt-4 flex gap-2 text-4xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < stars ? "scale-100" : "scale-75 opacity-30 grayscale"}>
                ⭐
              </span>
            ))}
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {isPerfect && (
              <span className="rounded-full bg-sun/40 px-4 py-2 font-nunito text-sm font-bold animate-popIn">
                🌟 Perfect! <span className="font-sarabun">คะแนนเต็ม!</span>
              </span>
            )}
            <span className="rounded-full bg-leaf/20 px-4 py-2 font-nunito text-sm font-bold animate-popIn">
              🖼️ Complete! <span className="font-sarabun">เสร็จแล้ว!</span>
            </span>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={startQuiz}
              className="min-h-[56px] rounded-2xl bg-coral px-6 py-4 font-nunito text-base font-bold text-white shadow-lg active:scale-95 transition-transform"
            >
              Try Again / <span className="font-sarabun">ลองอีกครั้ง</span>
            </button>
            <Link
              href={`/learn/${subjectSlug}`}
              className="min-h-[48px] flex items-center justify-center rounded-xl bg-sky-dark px-6 py-3 font-nunito text-sm font-bold text-white"
            >
              Back to Subject / <span className="font-sarabun ml-1">กลับ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
