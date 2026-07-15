"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AnswerRecord, QuizQuestion } from "@/lib/types";

interface QuizEngineProps {
  questions: QuizQuestion[];
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

function pickQuestions(pool: QuizQuestion[], n: number): QuizQuestion[] {
  return shuffle(pool).slice(0, n).map((q) => ({ ...q, options: shuffle(q.options) }));
}

function starCount(score: number): number {
  if (score <= 4) return 1;
  if (score <= 7) return 2;
  return 3;
}

const CONFETTI = ["🎉", "⭐", "🌟", "✨", "🎊", "💫", "🥳", "🦉"];
function ConfettiPiece({ index }: { index: number }) {
  return (
    <span className="pointer-events-none absolute text-2xl opacity-0 animate-confetti"
      style={{ left: `${(index * 37 + 13) % 100}%`, top: "-8%",
        animationDelay: `${(index * 0.3 % 2).toFixed(1)}s`,
        animationDuration: `${(2 + index % 3).toFixed(1)}s` }}>
      {CONFETTI[index % CONFETTI.length]}
    </span>
  );
}

type Phase = "ready" | "playing" | "results";

export default function QuizEngine({ questions, subjectId, subjectSlug, subjectTitle, subjectEmoji }: QuizEngineProps) {
  const QUIZ_SIZE = Math.min(10, questions.length);

  const [phase, setPhase] = useState<Phase>("ready");
  const [selectedQuestions, setSelectedQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [, setIsCorrect] = useState<boolean | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(false);
  const [trophiesAwarded, setTrophiesAwarded] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [saveError, setSaveError] = useState(false);

  const currentQuestion = selectedQuestions[currentIndex] ?? null;

  const startQuiz = useCallback(() => {
    setSelectedQuestions(pickQuestions(questions, QUIZ_SIZE));
    setCurrentIndex(0); setAnswers([]); setScore(0);
    setSelectedOption(null); setIsCorrect(null);
    setSaved(false); setTrophiesAwarded([]); setPhase("playing");
  }, [questions, QUIZ_SIZE]);

  const handleSelect = useCallback((optionIndex: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    const correct = currentQuestion.options[optionIndex].is_correct;
    setSelectedOption(optionIndex);
    setIsCorrect(correct);
    setAnswers((prev) => [...prev, { question_id: currentQuestion.id, selected_option: optionIndex, is_correct: correct }]);
    if (correct) setScore((prev) => prev + 1);
    advanceTimerRef.current = setTimeout(() => {
      if (currentIndex + 1 < QUIZ_SIZE) {
        setCurrentIndex((p) => p + 1); setSelectedOption(null); setIsCorrect(null);
      } else { setPhase("results"); }
    }, 1500);
  }, [selectedOption, currentQuestion, currentIndex, QUIZ_SIZE]);

  useEffect(() => () => { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); }, []);

  const playAudio = useCallback((url: string | null) => {
    if (!url) return;
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(url); audioRef.current = a; a.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== "results" || saved) return;
    async function saveAttempt() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from("quiz_attempts").insert({
          child_id: user.id, subject_id: subjectId,
          questions_shown: selectedQuestions.map((q) => q.id),
          answers: answers as unknown as AnswerRecord[],
          score, total: QUIZ_SIZE, completed_at: new Date().toISOString(),
        } as never);
        if (error) { setSaveError(true); } else {
          setSaved(true);
          try {
            const res = await fetch("/api/trophies", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ child_id: user.id, subject_id: subjectId, score, total: QUIZ_SIZE }),
            });
            const data = await res.json();
            if (data.awarded?.length > 0) setTrophiesAwarded(data.awarded);
          } catch { /* silent */ }
        }
      } catch { setSaveError(true); }
    }
    saveAttempt();
  }, [phase, saved, subjectId, selectedQuestions, answers, score, QUIZ_SIZE]);

  const stars = useMemo(() => starCount(score), [score]);
  const isPerfect = score === QUIZ_SIZE;

  /* ── READY PHASE ── */
  if (phase === "ready") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <span className="text-8xl animate-bounce mb-6">{subjectEmoji}</span>
        <h1 className="font-nunito text-3xl font-black text-text-dark text-center">{subjectTitle}</h1>
        <h2 className="font-nunito text-xl font-bold text-sky-dark mt-2">
          Quiz Time! <span className="font-sarabun text-lg">ทดสอบ!</span>
        </h2>
        <p className="mt-4 text-text-mid text-center">{QUIZ_SIZE} random questions / {QUIZ_SIZE} คำถามแบบสุ่ม</p>
        <button onClick={startQuiz}
          className="mt-8 min-h-[56px] rounded-2xl bg-coral px-10 py-4 font-nunito text-lg font-bold text-white shadow-lg active:scale-95 transition-transform">
          Start Quiz / <span className="font-sarabun">เริ่มทำแบบทดสอบ</span>
        </button>
        <Link href={`/learn/${subjectSlug}`}
          className="mt-4 min-h-[48px] flex items-center rounded-xl bg-sky-dark px-6 py-3 font-nunito text-sm font-bold text-white">
          ← Back / <span className="font-sarabun ml-1">กลับ</span>
        </Link>
      </div>
    );
  }

  /* ── PLAYING PHASE ── */
  if (phase === "playing" && currentQuestion) {
    const progress = ((currentIndex + 1) / QUIZ_SIZE) * 100;
    const correctIndex = currentQuestion.options.findIndex((o) => o.is_correct);
    const isW2P = currentQuestion.question_type === "word_to_picture";

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white" key={currentIndex}>
        {/* Top bar */}
        <div className="flex-shrink-0 px-4 pb-2" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          <div className="flex items-center justify-between mb-2">
            <Link href={`/learn/${subjectSlug}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-gray-600 active:scale-95 transition-transform">
              <span className="text-lg font-bold">✕</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-nunito text-sm font-bold text-text-dark">
                {currentIndex + 1}/{QUIZ_SIZE}
              </span>
              <span className="font-nunito text-sm font-bold text-leaf">
                ✅ {score}
              </span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-dark to-leaf transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question content - scrollable area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 pb-4">
          {/* Question prompt */}
          <div className="flex-shrink-0 py-3">
            <div className="flex justify-center mb-3">
              {currentQuestion.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={currentQuestion.image_url} alt="" className="h-24 w-24 rounded-xl object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sun/30 text-3xl">
                  {subjectEmoji}
                </div>
              )}
            </div>
            <h2 className="font-nunito text-xl font-extrabold text-text-dark text-center leading-snug">
              {currentQuestion.prompt_en}
            </h2>
            {currentQuestion.prompt_th && (
              <p className="font-sarabun text-sm text-text-mid text-center mt-1">{currentQuestion.prompt_th}</p>
            )}
            {currentQuestion.audio_url && (
              <div className="flex justify-center mt-2">
                <button onClick={() => playAudio(currentQuestion.audio_url)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-white text-sm active:scale-90">
                  🔊
                </button>
              </div>
            )}
          </div>

          {/* Options grid - fills remaining space */}
          <div className={`flex-1 grid grid-cols-2 gap-3 min-h-0 ${isW2P ? "auto-rows-fr" : "auto-rows-min"}`}>
            {currentQuestion.options.map((option, idx) => {
              let bg = "bg-white border-2 border-gray-200";
              let scale = "";
              if (selectedOption !== null) {
                if (idx === correctIndex) { bg = "bg-leaf/20 border-2 border-leaf"; scale = "scale-[1.02]"; }
                else if (idx === selectedOption && !option.is_correct) { bg = "bg-coral/20 border-2 border-coral"; }
                else { bg = "bg-white/50 border-2 border-gray-100 opacity-40"; }
              }

              return (
                <button key={idx} onClick={() => handleSelect(idx)} disabled={selectedOption !== null}
                  className={`rounded-2xl p-2 flex flex-col items-center justify-center transition-all duration-200 ${bg} ${scale} ${
                    selectedOption === null ? "active:scale-95 hover:border-sky-dark" : ""
                  }`}
                  style={{ minHeight: isW2P ? "0" : "56px" }}>
                  {/* word_to_picture: large image */}
                  {isW2P && option.image_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={option.image_url} alt={option.text}
                        className="w-full flex-1 min-h-0 object-contain rounded-lg" />
                      <span className="font-nunito text-lg font-bold text-text-dark mt-1 truncate w-full text-center">{option.text}</span>
                    </>
                  ) : (
                    <span className="font-nunito text-base font-bold text-text-dark text-center">{option.text}</span>
                  )}
                  {/* Feedback */}
                  {selectedOption !== null && idx === selectedOption && (
                    <span className="text-lg mt-1">{option.is_correct ? "✅" : "❌"}</span>
                  )}
                  {selectedOption !== null && idx === correctIndex && idx !== selectedOption && (
                    <span className="text-lg mt-1">✅</span>
                  )}
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
          {Array.from({ length: 20 }).map((_, i) => <ConfettiPiece key={i} index={i} />)}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-7xl animate-bounce">
            {isPerfect ? "🏆" : stars === 3 ? "🌟" : stars === 2 ? "👏" : "💪"}
          </div>

          <h1 className="font-nunito mt-4 text-3xl font-black text-text-dark text-center">
            {score} out of {QUIZ_SIZE}!
          </h1>
          <p className="font-sarabun text-lg text-text-mid">คุณได้ {score} จาก {QUIZ_SIZE}!</p>

          {/* Stars */}
          <div className="mt-4 flex gap-2 text-4xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < stars ? "scale-100" : "scale-75 opacity-30 grayscale"}>⭐</span>
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
              🏆 Complete! <span className="font-sarabun">เสร็จแล้ว!</span>
            </span>
          </div>

          {/* Trophies */}
          {trophiesAwarded.length > 0 && (
            <div className="mt-4 rounded-xl bg-sun/30 p-4 animate-popIn">
              <p className="font-nunito text-center text-sm font-bold mb-2">New Trophy! / รางวัลใหม่!</p>
              <div className="flex flex-wrap justify-center gap-2">
                {trophiesAwarded.map((t) => (
                  <span key={t} className="rounded-full bg-white px-3 py-1.5 text-sm font-bold shadow">
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

          {saveError && (
            <p className="mt-3 rounded-lg bg-coral/20 px-4 py-2 text-center text-sm text-text-mid">
              Score could not be saved / ไม่สามารถบันทึกคะแนนได้
            </p>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            <button onClick={startQuiz}
              className="min-h-[56px] rounded-2xl bg-coral px-6 py-4 font-nunito text-base font-bold text-white shadow-lg active:scale-95 transition-transform">
              Try Again / <span className="font-sarabun">ลองอีกครั้ง</span>
            </button>
            <Link href={`/learn/${subjectSlug}`}
              className="min-h-[48px] flex items-center justify-center rounded-xl bg-sky-dark px-6 py-3 font-nunito text-sm font-bold text-white">
              Back to Subject / <span className="font-sarabun ml-1">กลับ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
