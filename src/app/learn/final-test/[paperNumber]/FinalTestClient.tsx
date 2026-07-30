"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────

interface Option {
  id: string;
  option_number: number;
  text_en: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  item_number: number;
  part: string;
  points: number;
  situation_en: string | null;
  dialogue_en: string | null;
  prompt_en: string | null;
  passage_id: string | null;
  is_inference: boolean;
  options: Option[];
}

interface Passage {
  id: string;
  sort_order: number;
  title_en: string | null;
  body_en: string;
}

interface Assessment {
  id: string;
  title_en: string;
  title_th: string | null;
  paper_number: number;
  total_points: number;
  time_limit_minutes: number;
}

interface Props {
  assessment: Assessment;
  questions: Question[];
  passages: Passage[];
  userId: string;
}

// ─── Part config ────────────────────────────────────────

const PART_LABELS: Record<string, { en: string; th: string; color: string }> = {
  expression: { en: "Part I: Expression", th: "ส่วนที่ 1: การแสดงออก", color: "#0288D1" },
  reading: { en: "Part II: Reading Comprehension", th: "ส่วนที่ 2: การอ่าน", color: "#66BB6A" },
  structure: { en: "Part III: Structure and Writing", th: "ส่วนที่ 3: โครงสร้าง", color: "#FF8A65" },
  vocabulary: { en: "Part IV: Vocabulary", th: "ส่วนที่ 4: คำศัพท์", color: "#CE93D8" },
};

const PART_MAX: Record<string, number> = {
  expression: 16,
  reading: 36,
  structure: 33,
  vocabulary: 15,
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

// ─── Helpers ────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────

export default function FinalTestClient({
  assessment,
  questions,
  passages,
  userId,
}: Props) {
  const supabase = createClient();
  const [phase, setPhase] = useState<"intro" | "testing" | "results">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [timeLeft, setTimeLeft] = useState(assessment.time_limit_minutes * 60);
  const [results, setResults] = useState<{
    pointsEarned: number;
    pointsPossible: number;
    partScores: Record<string, number>;
    questionResults: Record<string, boolean>;
  } | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);

  // Passage lookup
  const passageById = useRef(
    new Map(passages.map((p) => [p.id, p]))
  ).current;

  const parts = ["expression", "reading", "structure", "vocabulary"];

  // ─── Start test ───────────────────────────────────────

  const startTest = useCallback(async () => {
    const { data, error } = await supabase
      .from("assessment_attempts")
      .insert({
        assessment_id: assessment.id,
        user_id: userId,
        points_possible: assessment.total_points,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create attempt:", error);
      return;
    }
    setAttemptId(data.id);
    setPhase("testing");
  }, [assessment.id, assessment.total_points, userId, supabase]);

  // ─── Timer ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "testing") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && phase === "testing") {
      submitTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  // ─── Save answer (crash-safe) ─────────────────────────

  const saveAnswer = useCallback(
    async (questionId: string, optionId: string) => {
      if (!attemptId) return;

      // Find if the option is correct
      const question = questions.find((q) => q.id === questionId);
      const option = question?.options.find((o) => o.id === optionId);
      const isCorrect = option?.is_correct ?? false;

      // Upsert the answer
      const { error } = await supabase.from("assessment_answers").upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          chosen_option_id: optionId,
          is_correct: isCorrect,
        },
        { onConflict: "attempt_id,question_id" }
      );

      if (error) {
        // If upsert fails (no unique constraint), try insert then update
        console.error("Save answer error:", error);
      }
    },
    [attemptId, questions, supabase]
  );

  const selectOption = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
      saveAnswer(questionId, optionId);
    },
    [saveAnswer]
  );

  // ─── Submit test ──────────────────────────────────────

  const submitTest = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate scores
    let totalEarned = 0;
    const partScores: Record<string, number> = {
      expression: 0,
      reading: 0,
      structure: 0,
      vocabulary: 0,
    };
    const questionResults: Record<string, boolean> = {};

    for (const q of questions) {
      const chosenOptionId = answers[q.id];
      if (chosenOptionId) {
        const chosenOption = q.options.find((o) => o.id === chosenOptionId);
        const correct = chosenOption?.is_correct ?? false;
        questionResults[q.id] = correct;
        if (correct) {
          totalEarned += q.points;
          partScores[q.part] = (partScores[q.part] ?? 0) + q.points;
        }
      } else {
        questionResults[q.id] = false;
      }
    }

    // Round to avoid floating point
    totalEarned = Math.round(totalEarned * 10) / 10;

    // Update the attempt
    if (attemptId) {
      await supabase
        .from("assessment_attempts")
        .update({
          submitted_at: new Date().toISOString(),
          points_earned: totalEarned,
          points_possible: assessment.total_points,
        })
        .eq("id", attemptId);
    }

    setResults({
      pointsEarned: totalEarned,
      pointsPossible: assessment.total_points,
      partScores,
      questionResults,
    });
    setPhase("results");
  }, [answers, assessment.total_points, attemptId, questions, supabase]);

  // ─── Current question ─────────────────────────────────

  const currentQuestion = questions[currentQuestionIdx];
  const currentPassage = currentQuestion?.passage_id
    ? passageById.get(currentQuestion.passage_id)
    : null;

  // Track when the part changes to show a header
  const prevQuestion = currentQuestionIdx > 0 ? questions[currentQuestionIdx - 1] : null;
  const isNewPart = !prevQuestion || prevQuestion.part !== currentQuestion?.part;

  // ─── INTRO SCREEN ─────────────────────────────────────

  if (phase === "intro") {
    return (
      <section className="max-w-lg mx-auto text-center py-8">
        <span className="text-5xl block mb-4">📝</span>
        <h1 className="font-nunito text-2xl font-extrabold text-text-dark dark:text-gray-100">
          {assessment.title_en}
        </h1>
        {assessment.title_th && (
          <p className="font-sarabun text-lg text-text-mid dark:text-gray-400 mt-1">
            {assessment.title_th}
          </p>
        )}

        <div className="mt-6 rounded-2xl bg-cream dark:bg-gray-800 p-5 text-left space-y-2">
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">Questions</span>
            <span className="text-text-dark dark:text-gray-200 font-bold">50</span>
          </div>
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">Total points</span>
            <span className="text-text-dark dark:text-gray-200 font-bold">100</span>
          </div>
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">Time limit</span>
            <span className="text-text-dark dark:text-gray-200 font-bold">90 minutes</span>
          </div>
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">Options per question</span>
            <span className="text-text-dark dark:text-gray-200 font-bold">5</span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-left">
          <p className="font-nunito text-sm text-text-mid dark:text-gray-400">
            Your answers are saved as you go. If you lose connection, you can return and continue.
            The timer will auto-submit your test when time runs out.
          </p>
        </div>

        <button
          onClick={startTest}
          className="mt-8 w-full rounded-xl bg-[#0288D1] hover:bg-[#01579B]
                     text-white font-nunito font-bold text-lg py-4 px-8
                     transition-colors shadow-md hover:shadow-lg"
        >
          Start Test
        </button>

        <Link
          href="/learn/final-test"
          className="mt-4 inline-block font-nunito text-sm text-text-mid dark:text-gray-400 hover:text-text-dark dark:hover:text-gray-200"
        >
          Back to paper list
        </Link>
      </section>
    );
  }

  // ─── RESULTS SCREEN ───────────────────────────────────

  if (phase === "results" && results) {
    const pct = Math.round(
      (results.pointsEarned / results.pointsPossible) * 100
    );
    const grade =
      pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : "Keep practising!";
    const gradeColor =
      pct >= 80
        ? "text-leaf-dark dark:text-leaf"
        : pct >= 60
          ? "text-sun-dark dark:text-sun"
          : "text-coral-dark dark:text-coral";

    return (
      <section className="max-w-lg mx-auto py-8">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">
            {pct >= 80 ? "🏆" : pct >= 60 ? "⭐" : "📝"}
          </span>
          <h1 className="font-nunito text-2xl font-extrabold text-text-dark dark:text-gray-100">
            Test Complete!
          </h1>
          <p className={`font-nunito text-xl font-bold mt-2 ${gradeColor}`}>
            {grade}
          </p>
        </div>

        {/* Score card */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6 mb-6">
          <div className="text-center mb-4">
            <span className={`font-nunito text-4xl font-extrabold ${gradeColor}`}>
              {results.pointsEarned}
            </span>
            <span className="font-nunito text-xl text-text-mid dark:text-gray-400">
              /{results.pointsPossible}
            </span>
            <p className="font-nunito text-sm text-text-mid dark:text-gray-400 mt-1">
              {pct}%
            </p>
          </div>

          {/* Per-part breakdown */}
          <div className="space-y-3">
            {parts.map((part) => {
              const label = PART_LABELS[part];
              const earned = Math.round((results.partScores[part] ?? 0) * 10) / 10;
              const max = PART_MAX[part];
              const partPct = max > 0 ? Math.round((earned / max) * 100) : 0;

              return (
                <div key={part}>
                  <div className="flex justify-between items-center text-sm font-nunito mb-1">
                    <span className="text-text-dark dark:text-gray-200">
                      {label.en}
                    </span>
                    <span className="text-text-mid dark:text-gray-400">
                      {earned}/{max}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${partPct}%`,
                        backgroundColor: label.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question-by-question review */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6 mb-6">
          <h2 className="font-nunito text-lg font-bold text-text-dark dark:text-gray-100 mb-4">
            Question Review
          </h2>
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q) => {
              const correct = results.questionResults[q.id];
              const answered = q.id in answers;
              return (
                <div
                  key={q.id}
                  className={`w-full aspect-square rounded-md flex items-center justify-center
                    text-xs font-nunito font-bold
                    ${
                      correct
                        ? "bg-leaf/20 text-leaf-dark dark:text-leaf"
                        : answered
                          ? "bg-coral/20 text-coral-dark dark:text-coral"
                          : "bg-gray-100 dark:bg-gray-700 text-text-light dark:text-gray-500"
                    }`}
                  title={`Q${q.item_number}: ${correct ? "Correct" : answered ? "Wrong" : "Skipped"}`}
                >
                  {q.item_number}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs font-nunito text-text-mid dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-leaf/20 inline-block" /> Correct
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-coral/20 inline-block" /> Wrong
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700 inline-block" />{" "}
              Skipped
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/learn/final-test"
            className="flex-1 rounded-xl bg-[#0288D1] hover:bg-[#01579B]
                       text-white font-nunito font-bold text-center py-3
                       transition-colors"
          >
            Back to Papers
          </Link>
          <Link
            href="/learn"
            className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                       text-text-dark dark:text-gray-200 font-nunito font-bold text-center py-3
                       transition-colors"
          >
            Home
          </Link>
        </div>
      </section>
    );
  }

  // ─── TESTING SCREEN ───────────────────────────────────

  if (!currentQuestion) return null;

  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft < 300; // 5 minutes

  return (
    <section className="pb-24">
      {/* Sticky header with timer and progress */}
      <div className="sticky top-[52px] z-20 -mx-4 px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="font-nunito text-sm text-text-mid dark:text-gray-400">
            <span className="font-bold text-text-dark dark:text-gray-200">
              {answeredCount}
            </span>
            /50 answered
          </div>

          <div
            className={`font-nunito text-lg font-bold tabular-nums ${
              isLowTime
                ? "text-coral-dark dark:text-coral animate-pulse"
                : "text-text-dark dark:text-gray-200"
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to submit? You cannot change your answers after submitting."
                )
              ) {
                submitTest();
              }
            }}
            className="rounded-lg bg-[#0288D1] hover:bg-[#01579B] text-white
                       font-nunito font-bold text-sm py-1.5 px-4 transition-colors"
          >
            Submit
          </button>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full bg-[#0288D1] transition-all duration-300"
              style={{ width: `${(answeredCount / 50) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question navigation dots */}
      <div className="mt-4 mb-6 max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-1">
          {questions.map((q, idx) => {
            const isAnswered = q.id in answers;
            const isCurrent = idx === currentQuestionIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIdx(idx)}
                className={`w-7 h-7 rounded text-xs font-nunito font-bold transition-all
                  ${
                    isCurrent
                      ? "bg-[#0288D1] text-white ring-2 ring-[#0288D1]/30"
                      : isAnswered
                        ? "bg-[#0288D1]/20 text-[#0288D1] dark:text-[#4FC3F7]"
                        : "bg-gray-100 dark:bg-gray-800 text-text-light dark:text-gray-500"
                  }`}
              >
                {q.item_number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Part header */}
      {isNewPart && currentQuestion && (
        <div
          className="max-w-2xl mx-auto mb-4 rounded-xl p-3"
          style={{ backgroundColor: PART_LABELS[currentQuestion.part]?.color + "20" }}
        >
          <h2
            className="font-nunito text-base font-bold"
            style={{ color: PART_LABELS[currentQuestion.part]?.color }}
          >
            {PART_LABELS[currentQuestion.part]?.en}
          </h2>
          <p className="font-sarabun text-xs" style={{ color: PART_LABELS[currentQuestion.part]?.color }}>
            {PART_LABELS[currentQuestion.part]?.th}
          </p>
        </div>
      )}

      {/* Passage — stays visible for all its questions */}
      {currentPassage && (
        <div className="max-w-2xl mx-auto mb-4 rounded-2xl bg-cream dark:bg-gray-800 p-5 border border-amber-200 dark:border-gray-700">
          {currentPassage.title_en && (
            <h3 className="font-nunito text-lg font-bold text-text-dark dark:text-gray-100 mb-3">
              {currentPassage.title_en}
            </h3>
          )}
          <div className="font-nunito text-sm text-text-dark dark:text-gray-200 leading-relaxed whitespace-pre-line">
            {currentPassage.body_en}
          </div>
        </div>
      )}

      {/* Expression: situation and dialogue */}
      {currentQuestion.part === "expression" && (
        <div className="max-w-2xl mx-auto mb-4">
          {currentQuestion.situation_en && (
            <div className="rounded-xl bg-[#0288D1]/10 dark:bg-[#0288D1]/20 p-4 mb-3">
              <p className="font-nunito text-xs font-bold text-[#0288D1] dark:text-[#4FC3F7] uppercase tracking-wide mb-1">
                Situation
              </p>
              <p className="font-nunito text-sm text-text-dark dark:text-gray-200">
                {currentQuestion.situation_en}
              </p>
            </div>
          )}
          {currentQuestion.dialogue_en && (
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
              <div className="font-nunito text-sm text-text-dark dark:text-gray-200 whitespace-pre-line leading-relaxed">
                {currentQuestion.dialogue_en}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question card */}
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-md p-5 mb-4">
          {/* Question number and prompt */}
          <div className="flex items-start gap-3 mb-5">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                         text-white font-nunito font-bold text-sm"
              style={{ backgroundColor: PART_LABELS[currentQuestion.part]?.color }}
            >
              {currentQuestion.item_number}
            </span>
            <div className="flex-1">
              {currentQuestion.prompt_en && (
                <p className="font-nunito text-base text-text-dark dark:text-gray-100 leading-snug">
                  {currentQuestion.prompt_en}
                </p>
              )}
              <p className="font-nunito text-xs text-text-light dark:text-gray-500 mt-1">
                {currentQuestion.points} {currentQuestion.points === 1 ? "point" : "points"}
              </p>
            </div>
          </div>

          {/* 5 Options */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => selectOption(currentQuestion.id, option.id)}
                  className={`w-full flex items-center gap-3 rounded-xl p-3.5 text-left
                    transition-all duration-150 border-2
                    ${
                      isSelected
                        ? "border-[#0288D1] bg-[#0288D1]/10 dark:bg-[#0288D1]/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#0288D1]/50 hover:bg-gray-50 dark:hover:bg-gray-750"
                    }`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      font-nunito font-bold text-sm transition-colors
                      ${
                        isSelected
                          ? "bg-[#0288D1] text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-text-mid dark:text-gray-400"
                      }`}
                  >
                    {OPTION_LETTERS[option.option_number - 1]}
                  </span>
                  <span
                    className={`font-nunito text-sm flex-1
                      ${
                        isSelected
                          ? "text-[#0288D1] dark:text-[#4FC3F7] font-semibold"
                          : "text-text-dark dark:text-gray-200"
                      }`}
                  >
                    {option.text_en}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            onClick={() =>
              setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))
            }
            disabled={currentQuestionIdx === 0}
            className="flex-1 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-text-dark dark:text-gray-200 font-nunito font-bold py-3
                       transition-colors"
          >
            Previous
          </button>
          {currentQuestionIdx < questions.length - 1 ? (
            <button
              onClick={() =>
                setCurrentQuestionIdx((prev) =>
                  Math.min(questions.length - 1, prev + 1)
                )
              }
              className="flex-1 rounded-xl bg-[#0288D1] hover:bg-[#01579B]
                         text-white font-nunito font-bold py-3
                         transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `You have answered ${answeredCount} of 50 questions. Submit your test?`
                  )
                ) {
                  submitTest();
                }
              }}
              className="flex-1 rounded-xl bg-leaf-dark hover:bg-leaf
                         text-white font-nunito font-bold py-3
                         transition-colors"
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
