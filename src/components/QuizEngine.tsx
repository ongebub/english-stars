"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AnswerRecord, QuizQuestion } from "@/lib/types";

/* ──────────────────────────────────────────────
 *  Props
 * ────────────────────────────────────────────── */

interface QuizEngineProps {
  questions: QuizQuestion[];
  subjectId: string;
  subjectSlug: string;
  subjectTitle: string;
}

/* ──────────────────────────────────────────────
 *  Helpers
 * ────────────────────────────────────────────── */

/** Fisher-Yates shuffle (non-mutating) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick up to `n` random questions, each with shuffled options */
function pickQuestions(pool: QuizQuestion[], n: number): QuizQuestion[] {
  const picked = shuffle(pool).slice(0, n);
  return picked.map((q) => ({
    ...q,
    options: shuffle(q.options),
  }));
}

/** Star rating from score */
function starCount(score: number): number {
  if (score <= 4) return 1;
  if (score <= 7) return 2;
  return 3;
}

/** Random confetti emojis */
const CONFETTI_EMOJIS = ["🎉", "⭐", "🌟", "✨", "🎊", "💫", "🥳", "🦉"];

function ConfettiPiece({ index }: { index: number }) {
  // Deterministic-ish but varied placement using index
  const emoji = CONFETTI_EMOJIS[index % CONFETTI_EMOJIS.length];
  const left = ((index * 37 + 13) % 100);
  const delay = ((index * 0.3) % 2).toFixed(1);
  const duration = (2 + (index % 3)).toFixed(1);

  return (
    <span
      className="pointer-events-none absolute text-2xl opacity-0 animate-confetti"
      style={{
        left: `${left}%`,
        top: "-8%",
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {emoji}
    </span>
  );
}

/* ──────────────────────────────────────────────
 *  Component
 * ────────────────────────────────────────────── */

type Phase = "ready" | "playing" | "results";

export default function QuizEngine({
  questions,
  subjectId,
  subjectSlug,
  subjectTitle,
}: QuizEngineProps) {
  const QUIZ_SIZE = Math.min(10, questions.length);

  /* ── Core state ── */
  const [phase, setPhase] = useState<Phase>("ready");
  const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [score, setScore] = useState(0);

  /* ── Per-question interaction state ── */
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [, setIsCorrect] = useState<boolean | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Results save flag ── */
  const [saved, setSaved] = useState(false);
  const [trophiesAwarded, setTrophiesAwarded] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* ── Current question shortcut ── */
  const currentQuestion = selectedQuestions[currentIndex] ?? null;

  /* ── Start / restart ── */
  const startQuiz = useCallback(() => {
    const picked = pickQuestions(questions, QUIZ_SIZE);
    setSelectedQuestions(picked);
    setCurrentIndex(0);
    setAnswers([]);
    setScore(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setSaved(false);
    setPhase("playing");
  }, [questions, QUIZ_SIZE]);

  /* ── Handle option tap ── */
  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (selectedOption !== null) return; // already answered
      if (!currentQuestion) return;

      const correct = currentQuestion.options[optionIndex].is_correct;
      setSelectedOption(optionIndex);
      setIsCorrect(correct);

      const newAnswer: AnswerRecord = {
        question_id: currentQuestion.id,
        selected_option: optionIndex,
        is_correct: correct,
      };

      setAnswers((prev) => [...prev, newAnswer]);
      if (correct) setScore((prev) => prev + 1);

      // Auto-advance after 1.5s
      advanceTimerRef.current = setTimeout(() => {
        if (currentIndex + 1 < QUIZ_SIZE) {
          setCurrentIndex((prev) => prev + 1);
          setSelectedOption(null);
          setIsCorrect(null);
        } else {
          setPhase("results");
        }
      }, 1500);
    },
    [selectedOption, currentQuestion, currentIndex, QUIZ_SIZE]
  );

  /* ── Cleanup timer on unmount ── */
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  /* ── Play question audio ── */
  const playAudio = useCallback((url: string | null) => {
    if (!url) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  /* ── Save attempt to Supabase when results phase begins ── */
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (phase !== "results" || saved) return;

    async function saveAttempt() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase.from("quiz_attempts").insert({
          child_id: user.id,
          subject_id: subjectId,
          questions_shown: selectedQuestions.map((q) => q.id),
          answers: answers as unknown as AnswerRecord[],
          score: score,
          total: QUIZ_SIZE,
          completed_at: new Date().toISOString(),
        } as never);

        if (error) {
          console.error("Failed to save quiz attempt:", error);
          setSaveError(true);
        } else {
          setSaved(true);

          // Check and award trophies
          try {
            const res = await fetch("/api/trophies", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                child_id: user.id,
                subject_id: subjectId,
                score,
                total: QUIZ_SIZE,
              }),
            });
            const data = await res.json();
            if (data.awarded?.length > 0) {
              setTrophiesAwarded(data.awarded);
            }
          } catch {
            // Trophy check failed silently
          }
        }
      } catch (err) {
        console.error("Failed to save quiz attempt:", err);
        setSaveError(true);
      }
    }

    saveAttempt();
  }, [phase, saved, subjectId, selectedQuestions, answers, score, QUIZ_SIZE]);

  /* ── Derived values ── */
  const stars = useMemo(() => starCount(score), [score]);
  const isPerfect = score === QUIZ_SIZE;

  /* ================================================================
   *  READY PHASE
   * ================================================================ */
  if (phase === "ready") {
    return (
      <section className="flex flex-col items-center py-8 animate-fadeIn">
        <span className="text-7xl animate-bounce-slow">🧠</span>

        <h1 className="font-nunito mt-4 text-center text-3xl font-extrabold text-text-dark">
          {subjectTitle}
        </h1>

        <h2 className="font-nunito mt-2 text-center text-2xl font-bold text-sky-dark">
          Quiz Time!{" "}
          <span className="font-sarabun text-xl font-semibold">
            &middot; ทดสอบ!
          </span>
        </h2>

        <p className="mt-4 text-center text-base text-text-mid">
          This quiz has {QUIZ_SIZE} random questions
        </p>
        <p className="font-sarabun text-center text-sm text-text-mid">
          แบบทดสอบนี้มี {QUIZ_SIZE} คำถามแบบสุ่ม
        </p>

        <button
          onClick={startQuiz}
          className="mt-8 inline-flex min-h-[56px] items-center gap-2 rounded-xl bg-coral px-8 font-nunito text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-coral-dark active:scale-95"
        >
          Start Quiz{" "}
          <span className="font-sarabun text-base font-semibold">
            &middot; เริ่มทำแบบทดสอบ
          </span>
        </button>

        <Link
          href={`/learn/${subjectSlug}`}
          className="mt-4 inline-flex min-h-[48px] items-center rounded-xl bg-sky-dark px-6 font-nunito text-sm font-bold text-white shadow hover:bg-sky-dark/90"
        >
          ← Back to {subjectTitle} /{" "}
          <span className="font-sarabun ml-1">กลับ</span>
        </Link>
      </section>
    );
  }

  /* ================================================================
   *  PLAYING PHASE
   * ================================================================ */
  if (phase === "playing" && currentQuestion) {
    const progress = ((currentIndex + 1) / QUIZ_SIZE) * 100;
    const correctIndex = currentQuestion.options.findIndex(
      (o) => o.is_correct
    );

    return (
      <section className="flex flex-col items-center animate-fadeIn" key={currentIndex}>
        {/* ── Progress bar ── */}
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between text-sm font-bold text-text-dark">
            <span>
              Question {currentIndex + 1} of {QUIZ_SIZE}
            </span>
            <span className="font-sarabun text-text-mid">
              ข้อ {currentIndex + 1} จาก {QUIZ_SIZE}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-white/60 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-dark to-leaf transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Question card ── */}
        <div className="mt-6 w-full max-w-md rounded-2xl bg-white p-6 shadow-lg animate-slideUp">
          {/* Image or emoji placeholder */}
          {currentQuestion.image_url ? (
            <div className="mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQuestion.image_url}
                alt={currentQuestion.prompt_en}
                className="h-40 w-40 rounded-xl object-contain"
              />
            </div>
          ) : (
            <div className="mb-4 flex justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-sun/30 text-5xl">
                {currentQuestion.question_type === "word_to_letter"
                  ? "🔤"
                  : currentQuestion.question_type === "fill_blank"
                  ? "✏️"
                  : "🖼️"}
              </div>
            </div>
          )}

          {/* Prompt */}
          <h2 className="font-nunito text-center text-xl font-extrabold text-text-dark">
            {currentQuestion.prompt_en}
          </h2>
          {currentQuestion.prompt_th && (
            <p className="font-sarabun mt-1 text-center text-base text-text-mid">
              {currentQuestion.prompt_th}
            </p>
          )}

          {/* Audio button */}
          {currentQuestion.audio_url && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => playAudio(currentQuestion.audio_url)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf text-white text-lg hover:bg-leaf-dark active:scale-95 transition-all"
                aria-label="Play question audio"
              >
                🔊
              </button>
            </div>
          )}
        </div>

        {/* ── Options (2x2 grid) ── */}
        <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-3">
          {currentQuestion.options.map((option, idx) => {
            let btnClass =
              "min-h-[56px] rounded-xl border-2 border-white/80 bg-white p-3 font-nunito text-base font-bold text-text-dark shadow transition-all duration-200";

            if (selectedOption !== null) {
              if (idx === correctIndex) {
                // Always highlight the correct answer
                btnClass =
                  "min-h-[56px] rounded-xl border-2 border-leaf bg-leaf/20 p-3 font-nunito text-base font-bold text-text-dark shadow scale-[1.03]";
              }
              if (idx === selectedOption && !option.is_correct) {
                // Wrong selection
                btnClass =
                  "min-h-[56px] rounded-xl border-2 border-coral bg-coral/20 p-3 font-nunito text-base font-bold text-text-dark shadow";
              }
              if (idx !== selectedOption && idx !== correctIndex) {
                // Dim unselected non-correct options
                btnClass =
                  "min-h-[56px] rounded-xl border-2 border-white/40 bg-white/50 p-3 font-nunito text-base font-bold text-text-light shadow opacity-50";
              }
            } else {
              // Hoverable default state
              btnClass +=
                " hover:border-sky-dark hover:bg-sky/10 hover:scale-[1.02] active:scale-95 cursor-pointer";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={selectedOption !== null}
                className={btnClass}
                style={{
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {option.image_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={option.image_url}
                        alt={option.text}
                        className="h-10 w-10 rounded object-contain"
                      />
                      <span>{option.text}</span>
                    </>
                  ) : (
                    <span>{option.text}</span>
                  )}

                  {/* Feedback icon */}
                  {selectedOption !== null && idx === selectedOption && (
                    <span className="ml-1 text-lg">
                      {option.is_correct ? "✅" : "❌"}
                    </span>
                  )}
                  {selectedOption !== null &&
                    idx === correctIndex &&
                    idx !== selectedOption && (
                      <span className="ml-1 text-lg">✅</span>
                    )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  /* ================================================================
   *  RESULTS PHASE
   * ================================================================ */
  if (phase === "results") {
    return (
      <section className="relative flex flex-col items-center overflow-hidden py-8 animate-fadeIn">
        {/* ── Confetti layer ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>

        {/* ── Score display ── */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-6xl animate-bounce-slow">
            {isPerfect ? "🏆" : stars === 3 ? "🌟" : stars === 2 ? "👏" : "💪"}
          </div>

          <h1 className="font-nunito mt-4 text-center text-3xl font-extrabold text-text-dark">
            You got {score} out of {QUIZ_SIZE}!
          </h1>
          <p className="font-sarabun mt-1 text-center text-xl text-text-mid">
            คุณได้ {score} จาก {QUIZ_SIZE}!
          </p>

          {/* Stars */}
          <div className="mt-4 flex gap-1 text-4xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`transition-all duration-300 ${
                  i < stars ? "scale-100 opacity-100" : "scale-75 opacity-30 grayscale"
                }`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                ⭐
              </span>
            ))}
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {isPerfect && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sun/40 px-4 py-2 font-nunito text-sm font-bold text-text-dark shadow animate-popIn">
                🌟 Perfect Score!{" "}
                <span className="font-sarabun">คะแนนเต็ม!</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf/20 px-4 py-2 font-nunito text-sm font-bold text-text-dark shadow animate-popIn">
              🏆 Quiz Complete!{" "}
              <span className="font-sarabun">ทำแบบทดสอบเสร็จแล้ว!</span>
            </span>
          </div>

          {/* Newly awarded trophies */}
          {trophiesAwarded.length > 0 && (
            <div className="mt-4 rounded-xl bg-sun/30 p-4 animate-popIn">
              <p className="font-nunito text-center text-sm font-bold text-text-dark mb-2">
                New Trophy! / รางวัลใหม่!
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {trophiesAwarded.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-text-dark shadow">
                    {t === "first_steps" && "🏆 First Steps"}
                    {t === "perfect_score" && "🌟 Perfect Score"}
                    {t === "on_fire" && "🔥 On Fire"}
                    {t === "subject_master" && "📚 Subject Master"}
                    {t === "sharp_shooter" && "🎯 Sharp Shooter"}
                    {t === "ollies_star" && "🦉 Ollie's Star"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Save error notice */}
          {saveError && (
            <p className="mt-4 rounded-lg bg-coral/20 px-4 py-2 text-center text-sm text-text-mid">
              Score could not be saved · ไม่สามารถบันทึกคะแนนได้
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={startQuiz}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-coral px-6 font-nunito text-base font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-coral-dark active:scale-95"
            >
              Try Again{" "}
              <span className="font-sarabun text-sm font-semibold">
                &middot; ลองอีกครั้ง
              </span>
            </button>

            <Link
              href={`/learn/${subjectSlug}`}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-sky-dark px-6 font-nunito text-base font-bold text-white shadow hover:bg-sky-dark/90"
            >
              Back to Subject{" "}
              <span className="font-sarabun text-sm font-semibold">
                &middot; กลับ
              </span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
