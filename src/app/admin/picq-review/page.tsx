'use client';

// app/admin/picq-review/page.tsx — Picture quiz review gallery
// Chris reviews question images + text, flags questions for rework.

import { useEffect, useMemo, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

const supabase = createClient();

type Subject = {
  id: string;
  title_en: string;
  emoji: string;
  unreviewed: number;
};

type Option = {
  text: string;
  image_url: string;
  is_correct: boolean;
};

type Question = {
  id: string;
  subject_id: string;
  question_en: string;
  question_th: string;
  audio_url: string | null;
  correct_option_text: string;
  options: Option[];
  difficulty: number;
  flagged: boolean;
  flag_notes: string | null;
  reviewed: boolean;
};

export default function PicqReviewPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load subjects that have picture quiz questions + unreviewed counts
  useEffect(() => {
    async function loadSubjects() {
      const { data, error: err } = await supabase
        .from('picture_quiz_questions')
        .select('subject_id, reviewed');
      if (err) { setError(err.message); setLoading(false); return; }

      // Count unreviewed per subject
      const countMap: Record<string, number> = {};
      for (const r of data ?? []) {
        if (!countMap[r.subject_id]) countMap[r.subject_id] = 0;
        if (!r.reviewed) countMap[r.subject_id]++;
      }
      const subjectIds = Object.keys(countMap);
      if (subjectIds.length === 0) { setLoading(false); return; }

      const { data: subData, error: sErr } = await supabase
        .from('subjects')
        .select('id, title_en, emoji')
        .in('id', subjectIds)
        .order('sort_order');
      if (sErr) { setError(sErr.message); setLoading(false); return; }
      setSubjects((subData ?? []).map(s => ({ ...s, unreviewed: countMap[s.id] || 0 })) as Subject[]);
      setLoading(false);
    }
    loadSubjects();
  }, []);

  // Load questions when subject changes
  useEffect(() => {
    if (!selectedSubjectId) { setQuestions([]); return; }
    async function loadQuestions() {
      setLoadingQuestions(true);
      const { data, error: err } = await supabase
        .from('picture_quiz_questions')
        .select('*')
        .eq('subject_id', selectedSubjectId)
        .order('created_at');
      if (err) { setError(err.message); setLoadingQuestions(false); return; }
      setQuestions(data as Question[]);
      setLoadingQuestions(false);
    }
    loadQuestions();
  }, [selectedSubjectId]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null;

  const flaggedCount = useMemo(
    () => questions.filter((q) => q.flagged).length,
    [questions]
  );

  async function toggleFlag(question: Question) {
    const newVal = !question.flagged;
    const notes = newVal ? (prompt('Correction notes (what needs fixing):') || '') : null;
    setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, flagged: newVal, flag_notes: notes } : q)));
    const { error } = await supabase
      .from('picture_quiz_questions')
      .update({ flagged: newVal, flag_notes: notes })
      .eq('id', question.id);
    if (error) {
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, flagged: !newVal } : q)));
      alert(`Failed: ${error.message}`);
    }
  }

  async function updateNotes(question: Question, notes: string) {
    setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, flag_notes: notes } : q)));
    await supabase.from('picture_quiz_questions').update({ flag_notes: notes }).eq('id', question.id);
  }

  async function markReviewed(question: Question) {
    setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, reviewed: true } : q)));
    await supabase.from('picture_quiz_questions').update({ reviewed: true }).eq('id', question.id);
  }

  async function markAllReviewed() {
    if (!selectedSubjectId || !confirm('Mark all questions in this subject as reviewed?')) return;
    setQuestions((prev) => prev.map((q) => ({ ...q, reviewed: true })));
    await supabase.from('picture_quiz_questions').update({ reviewed: true }).eq('subject_id', selectedSubjectId);
  }

  function playAudio(url: string, questionId: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === questionId) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(questionId);
    audio.onended = () => { setPlayingId(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingId(null); audioRef.current = null; };
    audio.play();
  }

  if (loading) return <main className="p-8 text-gray-500 dark:text-gray-400">Loading picture quiz subjects...</main>;
  if (error) return <main className="p-8 text-red-600">Error: {error}</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Picture Quiz Review</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {subjects.length} subjects with picture quizzes
        </p>
      </header>

      {/* Subject filter */}
      <div className="mb-8">
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select a subject...</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.title_en}{s.unreviewed > 0 ? ` (${s.unreviewed} to review)` : ' \u2713'}
            </option>
          ))}
        </select>
      </div>

      {/* Selected subject header + questions */}
      {selectedSubject && (
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {selectedSubject.emoji} {selectedSubject.title_en}
            </h2>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {flaggedCount} flagged / {questions.length} total
              </p>
              {questions.some(q => !q.reviewed) && (
                <button
                  onClick={markAllReviewed}
                  className="rounded-lg px-4 py-2 text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  Mark All Reviewed
                </button>
              )}
            </div>
          </div>

          {loadingQuestions ? (
            <p className="text-gray-500 dark:text-gray-400">Loading questions...</p>
          ) : (
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`rounded-lg border p-5 transition-colors ${
                    q.flagged
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                        #{idx + 1}
                      </span>
                      <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                        {q.question_en}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {q.question_th}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {q.audio_url && (
                        <button
                          onClick={() => playAudio(q.audio_url!, q.id)}
                          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                            playingId === q.id
                              ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700'
                          }`}
                          title="Play audio"
                        >
                          {playingId === q.id ? '\u23F8 Pause' : '\u25B6 Play'}
                        </button>
                      )}
                      {!q.reviewed && (
                        <button
                          onClick={() => markReviewed(q)}
                          className="rounded-lg px-3 py-1.5 text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 transition-colors"
                        >
                          Reviewed
                        </button>
                      )}
                      {q.reviewed && (
                        <span className="rounded-lg px-3 py-1.5 text-sm bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          Done
                        </span>
                      )}
                      <button
                        onClick={() => toggleFlag(q)}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          q.flagged
                            ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-700'
                        }`}
                      >
                        {q.flagged ? '\uD83D\uDEA9 Flagged' : '\uD83D\uDEA9 Flag'}
                      </button>
                    </div>
                  </div>

                  {/* Flag notes */}
                  {q.flagged && (
                    <div className="mt-2 mb-3">
                      <textarea
                        value={q.flag_notes || ''}
                        onChange={(e) => updateNotes(q, e.target.value)}
                        placeholder="Correction notes — what needs fixing..."
                        className="w-full rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* 2x2 option grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`relative rounded-lg border-2 overflow-hidden ${
                          opt.is_correct
                            ? 'border-green-500 dark:border-green-400'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="relative aspect-square bg-gray-50 dark:bg-gray-700">
                          <Image
                            src={opt.image_url}
                            alt={opt.text}
                            fill
                            sizes="(max-width: 768px) 45vw, 280px"
                            className="object-contain"
                            unoptimized
                          />
                          {/* Green check overlay for correct answer */}
                          {opt.is_correct && (
                            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className={`px-2 py-1.5 text-center text-sm font-medium ${
                          opt.is_correct
                            ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {opt.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Metadata footer */}
                  <div className="flex gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
                    <span>Correct: {q.correct_option_text}</span>
                    <span>Difficulty: {q.difficulty}</span>
                    {q.audio_url ? <span className="text-green-600">audio</span> : <span>no audio</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
