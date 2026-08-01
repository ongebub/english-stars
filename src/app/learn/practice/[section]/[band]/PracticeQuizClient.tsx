"use client";

import { useState, useCallback, useRef } from "react";
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
  section: string;
  grade_band: string;
  total_points: number;
}

interface Props {
  assessment: Assessment;
  questions: Question[];
  passages: Passage[];
  userId: string;
}

// ─── Config ─────────────────────────────────────────────

const SECTION_META: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  expression: { label: "Expression", emoji: "💬", color: "#0288D1" },
  reading: { label: "Reading", emoji: "📖", color: "#66BB6A" },
  structure: { label: "Structure", emoji: "🔧", color: "#FF8A65" },
  vocabulary: { label: "Vocabulary", emoji: "📝", color: "#CE93D8" },
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

// ─── Component ──────────────────────────────────────────

export default function PracticeQuizClient({
  assessment,
  questions,
  passages,
  userId,
}: Props) {
  const supabase = createClient();
  const [phase, setPhase] = useState<"intro" | "testing" | "results">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<{
    pointsEarned: number;
    pointsPossible: number;
    questionResults: Record<string, boolean>;
  } | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const submittingRef = useRef(false);

  const meta = SECTION_META[assessment.section] ?? {
    label: assessment.section,
    emoji: "📝",
    color: "#0288D1",
  };

  // Passage lookup
  const passageById = useRef(
    new Map(passages.map((p) => [p.id, p]))
  ).current;

  // ─── Start quiz ───────────────────────────────────────

  const startQuiz = useCallback(async () => {
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

  // ─── Save answer ─────────────────────────────────────

  const saveAnswer = useCallback(
    async (questionId: string, optionId: string) => {
      if (!attemptId) return;

      const question = questions.find((q) => q.id === questionId);
      const option = question?.options.find((o) => o.id === optionId);
      const isCorrect = option?.is_correct ?? false;

      await supabase.from("assessment_answers").upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          chosen_option_id: optionId,
          is_correct: isCorrect,
        },
        { onConflict: "attempt_id,question_id" }
      );
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

  // ─── Submit quiz ──────────────────────────────────────

  const submitQuiz = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    let totalEarned = 0;
    const questionResults: Record<string, boolean> = {};

    for (const q of questions) {
      const chosenOptionId = answers[q.id];
      if (chosenOptionId) {
        const chosenOption = q.options.find((o) => o.id === chosenOptionId);
        const correct = chosenOption?.is_correct ?? false;
        questionResults[q.id] = correct;
        if (correct) totalEarned += 1;
      } else {
        questionResults[q.id] = false;
      }
    }

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
      questionResults,
    });
    setPhase("results");
  }, [answers, assessment.total_points, attemptId, questions, supabase]);

  // ─── Current question ─────────────────────────────────

  const currentQuestion = questions[currentQuestionIdx];
  const currentPassage = currentQuestion?.passage_id
    ? passageById.get(currentQuestion.passage_id)
    : null;

  // ─── INTRO SCREEN ─────────────────────────────────────

  if (phase === "intro") {
    return (
      <section className="max-w-lg mx-auto text-center py-8">
        <span className="text-5xl block mb-4">{meta.emoji}</span>
        <h1 className="font-nunito text-2xl font-extrabold text-text-dark dark:text-gray-100">
          {assessment.title_en}
        </h1>

        <div className="mt-6 rounded-2xl bg-cream dark:bg-gray-800 p-5 text-left space-y-2">
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">Questions</span>
            <span className="text-text-dark dark:text-gray-200 font-bold">
              15
            </span>
          </div>
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">
              Points per question
            </span>
            <span className="text-text-dark dark:text-gray-200 font-bold">
              1
            </span>
          </div>
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">Time limit</span>
            <span className="text-text-dark dark:text-gray-200 font-bold">
              None — take your time
            </span>
          </div>
          <div className="flex justify-between font-nunito text-sm">
            <span className="text-text-mid dark:text-gray-400">
              Options per question
            </span>
            <span className="text-text-dark dark:text-gray-200 font-bold">
              5
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-left">
          <p className="font-nunito text-sm text-text-mid dark:text-gray-400">
            This is a practice quiz — no timer, no pressure. After you finish,
            you will see which answers were correct so you can learn from any
            mistakes.
          </p>
        </div>

        <button
          onClick={startQuiz}
          className="mt-8 w-full rounded-xl text-white font-nunito font-bold text-lg py-4 px-8
                     transition-colors shadow-md hover:shadow-lg"
          style={{ backgroundColor: meta.color }}
        >
          Start Practice
        </button>

        <Link
          href="/learn/practice"
          className="mt-4 inline-block font-nunito text-sm text-text-mid dark:text-gray-400 hover:text-text-dark dark:hover:text-gray-200"
        >
          Back to quiz list
        </Link>
      </section>
    );
  }

  // ─── RESULTS SCREEN (with correct answer reveal) ──────

  if (phase === "results" && results) {
    const pct = Math.round(
      (results.pointsEarned / results.pointsPossible) * 100
    );
    const grade =
      pct >= 80
        ? "Excellent!"
        : pct >= 60
          ? "Good job!"
          : "Keep practising!";
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
            {pct >= 80 ? "🌟" : pct >= 60 ? "⭐" : "📝"}
          </span>
          <h1 className="font-nunito text-2xl font-extrabold text-text-dark dark:text-gray-100">
            Practice Complete!
          </h1>
          <p className={`font-nunito text-xl font-bold mt-2 ${gradeColor}`}>
            {grade}
          </p>
        </div>

        {/* Score card */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6 mb-6">
          <div className="text-center mb-4">
            <span
              className={`font-nunito text-4xl font-extrabold ${gradeColor}`}
            >
              {results.pointsEarned}
            </span>
            <span className="font-nunito text-xl text-text-mid dark:text-gray-400">
              /{results.pointsPossible}
            </span>
            <p className="font-nunito text-sm text-text-mid dark:text-gray-400 mt-1">
              {pct}%
            </p>
          </div>

          {/* Question grid */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {questions.map((q) => {
              const correct = results.questionResults[q.id];
              const answered = q.id in answers;
              return (
                <div
                  key={q.id}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center
                    text-sm font-nunito font-bold
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
              <span className="w-3 h-3 rounded bg-leaf/20 inline-block" />{" "}
              Correct
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-coral/20 inline-block" />{" "}
              Wrong
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700 inline-block" />{" "}
              Skipped
            </span>
          </div>
        </div>

        {/* Answer review — shows correct answers */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6 mb-6">
          <h2 className="font-nunito text-lg font-bold text-text-dark dark:text-gray-100 mb-4">
            Review Answers
          </h2>
          <div className="space-y-4">
            {questions.map((q) => {
              const chosenId = answers[q.id];
              const wasCorrect = results.questionResults[q.id];
              const correctOption = q.options.find((o) => o.is_correct);
              const chosenOption = q.options.find((o) => o.id === chosenId);
              const passage = q.passage_id
                ? passageById.get(q.passage_id)
                : null;

              return (
                <div
                  key={q.id}
                  className={`rounded-xl p-4 border-2 ${
                    wasCorrect
                      ? "border-leaf/30 bg-leaf/5"
                      : "border-coral/30 bg-coral/5"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                                 text-white font-nunito font-bold text-xs"
                      style={{ backgroundColor: meta.color }}
                    >
                      {q.item_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      {q.situation_en && (
                        <p className="font-nunito text-xs text-text-mid dark:text-gray-400 mb-1">
                          Situation: {q.situation_en}
                        </p>
                      )}
                      {passage && (
                        <p className="font-nunito text-xs text-text-mid dark:text-gray-400 mb-1 italic">
                          From: {passage.title_en}
                        </p>
                      )}
                      <p className="font-nunito text-sm text-text-dark dark:text-gray-200">
                        {q.prompt_en}
                      </p>
                    </div>
                  </div>

                  {!wasCorrect && (
                    <div className="ml-8 space-y-1">
                      {chosenOption && (
                        <p className="font-nunito text-sm text-coral-dark dark:text-coral">
                          Your answer:{" "}
                          <span className="line-through">
                            {chosenOption.text_en}
                          </span>
                        </p>
                      )}
                      {!chosenOption && (
                        <p className="font-nunito text-sm text-text-light dark:text-gray-500 italic">
                          Not answered
                        </p>
                      )}
                      <p className="font-nunito text-sm text-leaf-dark dark:text-leaf font-semibold">
                        Correct answer: {correctOption?.text_en}
                      </p>
                    </div>
                  )}
                  {wasCorrect && (
                    <div className="ml-8">
                      <p className="font-nunito text-sm text-leaf-dark dark:text-leaf">
                        {correctOption?.text_en}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/learn/practice"
            className="flex-1 rounded-xl text-white font-nunito font-bold text-center py-3
                       transition-colors"
            style={{ backgroundColor: meta.color }}
          >
            More Quizzes
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

  return (
    <section className="pb-24">
      {/* Sticky header — no timer */}
      <div className="sticky top-[52px] z-20 -mx-4 px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="font-nunito text-sm text-text-mid dark:text-gray-400">
            <span className="font-bold text-text-dark dark:text-gray-200">
              {answeredCount}
            </span>
            /15 answered
          </div>

          <div className="flex items-center gap-2">
            <span
              className="font-nunito text-sm font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: meta.color }}
            >
              {meta.label}
            </span>
          </div>

          <button
            onClick={() => {
              if (
                window.confirm(
                  `You have answered ${answeredCount} of 15 questions. Submit your quiz?`
                )
              ) {
                submitQuiz();
              }
            }}
            className="rounded-lg text-white font-nunito font-bold text-sm py-1.5 px-4 transition-colors"
            style={{ backgroundColor: meta.color }}
          >
            Submit
          </button>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(answeredCount / 15) * 100}%`,
                backgroundColor: meta.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Question navigation dots */}
      <div className="mt-4 mb-6 max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, idx) => {
            const isAnswered = q.id in answers;
            const isCurrent = idx === currentQuestionIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIdx(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-nunito font-bold transition-all
                  ${
                    isCurrent
                      ? "text-white ring-2 ring-offset-1"
                      : isAnswered
                        ? "text-white/80"
                        : "bg-gray-100 dark:bg-gray-800 text-text-light dark:text-gray-500"
                  }`}
                style={
                  isCurrent
                    ? { backgroundColor: meta.color, boxShadow: `0 0 0 3px ${meta.color}40` }
                    : isAnswered
                      ? { backgroundColor: meta.color + "80" }
                      : undefined
                }
              >
                {q.item_number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Passage — for reading quizzes */}
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
            <div
              className="rounded-xl p-4 mb-3"
              style={{ backgroundColor: meta.color + "15" }}
            >
              <p
                className="font-nunito text-xs font-bold uppercase tracking-wide mb-1"
                style={{ color: meta.color }}
              >
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
          <div className="flex items-start gap-3 mb-5">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                         text-white font-nunito font-bold text-sm"
              style={{ backgroundColor: meta.color }}
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
                1 point
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
                        ? "bg-opacity-10"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
                    }`}
                  style={
                    isSelected
                      ? {
                          borderColor: meta.color,
                          backgroundColor: meta.color + "15",
                        }
                      : undefined
                  }
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      font-nunito font-bold text-sm transition-colors
                      ${
                        isSelected
                          ? "text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-text-mid dark:text-gray-400"
                      }`}
                    style={
                      isSelected
                        ? { backgroundColor: meta.color }
                        : undefined
                    }
                  >
                    {OPTION_LETTERS[option.option_number - 1]}
                  </span>
                  <span
                    className={`font-nunito text-sm flex-1
                      ${
                        isSelected
                          ? "font-semibold"
                          : "text-text-dark dark:text-gray-200"
                      }`}
                    style={isSelected ? { color: meta.color } : undefined}
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
              className="flex-1 rounded-xl text-white font-nunito font-bold py-3
                         transition-colors"
              style={{ backgroundColor: meta.color }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `You have answered ${answeredCount} of 15 questions. Submit your quiz?`
                  )
                ) {
                  submitQuiz();
                }
              }}
              className="flex-1 rounded-xl bg-leaf-dark hover:bg-leaf
                         text-white font-nunito font-bold py-3
                         transition-colors"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
