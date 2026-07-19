'use client';

// app/punchlist/page.tsx — English Allstars Launch Tracker
// Section 1: Live-computed subject completeness grid
// Section 2: Phased roadmap with Matt/Chris/Done tri-checkboxes (realtime via Supabase)

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/* ---------- types ---------- */

type SubjectRow = {
  id: string;
  title_en: string;
  grade_band: string;
  sort_order: number;
  storybook_planned: boolean;
  quiz_target: number;
  flashcard_count: number;
  quiz_count: number;
  picture_quiz_count: number;
  ebook_page_count: number;
};

type RoadmapItem = {
  id: string;
  section: string;
  item_number: number;
  title: string;
  description: string;
  matt_checked: boolean;
  chris_checked: boolean;
  done: boolean;
  phase: number | null;
};

type CheckField = 'done';

/* ---------- helpers ---------- */

function gradeLabel(g: string) {
  if (g === 'K') return 'K';
  if (g === '1') return 'G1';
  if (g === '2') return 'G2';
  if (g === '3') return 'G3';
  return g;
}

function isComplete(s: SubjectRow) {
  const fc = s.flashcard_count > 0;
  const quiz = s.quiz_count >= s.quiz_target;
  const pq = s.picture_quiz_count >= 20;
  const sb = s.storybook_planned ? s.ebook_page_count > 0 : true; // N/A counts as done
  return fc && quiz && pq && sb;
}

/* ---------- component ---------- */

export default function PunchlistPage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- load subjects with counts (via server-side RPC — no truncation) ---- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Fetch subjects + counts in parallel
      const [{ data: subData, error: subErr }, { data: counts, error: cErr }] = await Promise.all([
        supabase.from('subjects').select('id, title_en, grade_band, sort_order, storybook_planned, quiz_target').eq('is_published', true).order('sort_order'),
        supabase.rpc('subject_completion_counts'),
      ]);
      if (cancelled) return;
      if (subErr || cErr) { setError((subErr || cErr)!.message); setLoadingSubjects(false); return; }

      type CountRow = { subject_id: string; flashcard_count: number; quiz_count: number; picture_quiz_count: number; ebook_page_count: number };
      const countMap = new Map((counts as CountRow[] ?? []).map((c) => [c.subject_id, c]));
      const merged: SubjectRow[] = (subData ?? []).map((s: { id: string; title_en: string; grade_band: string; sort_order: number; storybook_planned: boolean; quiz_target: number }) => {
        const c = countMap.get(s.id);
        return { ...s, flashcard_count: Number(c?.flashcard_count ?? 0), quiz_count: Number(c?.quiz_count ?? 0), picture_quiz_count: Number(c?.picture_quiz_count ?? 0), ebook_page_count: Number(c?.ebook_page_count ?? 0) };
      });
      setSubjects(merged);
      setLoadingSubjects(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* ---- load roadmap items ---- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error: err } = await supabase
        .from('punchlist_items')
        .select('*')
        .not('phase', 'is', null)
        .order('item_number');
      if (cancelled) return;
      if (err) setError(err.message);
      else setRoadmapItems((data as RoadmapItem[]) ?? []);
      setLoadingRoadmap(false);
    }
    load();

    // Realtime for roadmap items
    const channel = supabase
      .channel('roadmap-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'punchlist_items' },
        (payload) => {
          const updated = payload.new as RoadmapItem;
          setRoadmapItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---- toggle roadmap checkbox ---- */
  const toggleRoadmap = useCallback(async (item: RoadmapItem, field: CheckField) => {
    const newValue = !item[field];
    setRoadmapItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, [field]: newValue } : it))
    );
    const { error: err } = await supabase
      .from('punchlist_items')
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (err) {
      setRoadmapItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, [field]: !newValue } : it))
      );
      alert(`Save failed: ${err.message}`);
    }
  }, []);

  /* ---- toggle storybook_planned ---- */
  const toggleStorybookPlanned = useCallback(async (subject: SubjectRow) => {
    const newValue = !subject.storybook_planned;
    setSubjects((prev) =>
      prev.map((s) => (s.id === subject.id ? { ...s, storybook_planned: newValue } : s))
    );
    const { error: err } = await supabase
      .from('subjects')
      .update({ storybook_planned: newValue })
      .eq('id', subject.id);
    if (err) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === subject.id ? { ...s, storybook_planned: !newValue } : s))
      );
      alert(`Save failed: ${err.message}`);
    }
  }, []);

  /* ---- derived stats ---- */
  const completeCount = useMemo(() => subjects.filter(isComplete).length, [subjects]);

  const roadmapByPhase = useMemo(() => {
    const map = new Map<string, RoadmapItem[]>();
    for (const it of roadmapItems) {
      const key = it.section;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [roadmapItems]);

  const roadmapDoneCount = roadmapItems.filter((i) => i.done).length;

  const loading = loadingSubjects || loadingRoadmap;

  if (loading) return <main className="p-8 text-gray-500 dark:text-gray-400">Loading launch tracker...</main>;
  if (error) return <main className="p-8 text-red-600">Error: {error}</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* ===== PAGE HEADER ===== */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Launch Tracker</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Live completeness + phased roadmap — updates sync in real time
        </p>
      </header>

      {/* ===== SECTION 1: SUBJECTS ===== */}
      <section className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Subjects</h2>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {completeCount} of {subjects.length} subjects complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${subjects.length ? (completeCount / subjects.length) * 100 : 0}%` }}
          />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2 text-center">Grade</th>
                <th className="px-3 py-2 text-center">Flashcards</th>
                <th className="px-3 py-2 text-center">Quiz</th>
                <th className="px-3 py-2 text-center">Picture Quiz</th>
                <th className="px-3 py-2 text-center">Storybook</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const complete = isComplete(s);
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                      complete ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{s.title_en}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-block rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {gradeLabel(s.grade_band)}
                      </span>
                    </td>
                    <CellCount value={s.flashcard_count} threshold={1} />
                    <CellCount value={s.quiz_count} threshold={s.quiz_target} label={`${s.quiz_count}/${s.quiz_target}`} />
                    <CellCount value={s.picture_quiz_count} threshold={20} label={`${s.picture_quiz_count}/20`} />
                    <StorybookCell subject={s} onToggle={toggleStorybookPlanned} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {subjects.map((s) => {
            const complete = isComplete(s);
            return (
              <div
                key={s.id}
                className={`rounded-lg border p-3 ${
                  complete
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{s.title_en}</span>
                  <span className="inline-block rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {gradeLabel(s.grade_band)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-center">
                  <MobileCell label="FC" value={s.flashcard_count} threshold={1} />
                  <MobileCell label="Quiz" value={s.quiz_count} threshold={s.quiz_target} display={`${s.quiz_count}/${s.quiz_target}`} />
                  <MobileCell label="PQ" value={s.picture_quiz_count} threshold={20} display={`${s.picture_quiz_count}/20`} />
                  <MobileStorybookCell subject={s} onToggle={toggleStorybookPlanned} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== SECTION 2: PHASED ROADMAP ===== */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Roadmap</h2>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {roadmapDoneCount} of {roadmapItems.length} done
          </span>
        </div>

        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${roadmapItems.length ? (roadmapDoneCount / roadmapItems.length) * 100 : 0}%` }}
          />
        </div>

        {roadmapByPhase.map(([section, items]) => {
          const sectionDone = items.filter((i) => i.done).length;
          const allDone = sectionDone === items.length;
          return (
            <div key={section} className="mb-8">
              <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">
                <h3 className={`text-lg font-semibold ${allDone ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-200'}`}>
                  {section}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">{sectionDone}/{items.length}</span>
              </div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      item.done
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className={item.done ? 'line-through text-gray-400 dark:text-gray-500' : ''}>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-4 pt-1">
                        <Check
                          label="Done"
                          checked={item.done}
                          color="accent-green-600"
                          onChange={() => toggleRoadmap(item, 'done')}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </main>
  );
}

/* ---------- sub-components ---------- */

function CellCount({
  value,
  threshold,
  label,
}: {
  value: number;
  threshold: number;
  label?: string;
}) {
  const met = value >= threshold;
  return (
    <td className="px-3 py-2 text-center">
      <span className={`inline-flex items-center gap-1 ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
        {met ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
          </svg>
        )}
        <span className="text-xs">{label ?? value}</span>
      </span>
    </td>
  );
}

function StorybookCell({
  subject,
  onToggle,
}: {
  subject: SubjectRow;
  onToggle: (s: SubjectRow) => void;
}) {
  if (!subject.storybook_planned) {
    return (
      <td className="px-3 py-2 text-center">
        <span className="inline-flex items-center gap-1 text-gray-300 dark:text-gray-600 text-xs">
          N/A
          <button
            onClick={() => onToggle(subject)}
            title="Toggle storybook planned"
            className="ml-1 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4-4m-4 4l4 4" />
            </svg>
          </button>
        </span>
      </td>
    );
  }

  const met = subject.ebook_page_count > 0;
  return (
    <td className="px-3 py-2 text-center">
      <span className={`inline-flex items-center gap-1 ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
        {met ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
          </svg>
        )}
        <span className="text-xs">{subject.ebook_page_count}pg</span>
        <button
          onClick={() => onToggle(subject)}
          title="Toggle storybook planned"
          className="ml-0.5 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4-4m-4 4l4 4" />
          </svg>
        </button>
      </span>
    </td>
  );
}

function MobileCell({
  label,
  value,
  threshold,
  display,
}: {
  label: string;
  value: number;
  threshold: number;
  display?: string;
}) {
  const met = value >= threshold;
  return (
    <div className={`flex flex-col items-center gap-0.5 ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      {met ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
      <span className="text-[10px]">{display ?? value}</span>
    </div>
  );
}

function MobileStorybookCell({
  subject,
  onToggle,
}: {
  subject: SubjectRow;
  onToggle: (s: SubjectRow) => void;
}) {
  if (!subject.storybook_planned) {
    return (
      <div className="flex flex-col items-center gap-0.5 text-gray-300 dark:text-gray-600">
        <span className="text-[10px] uppercase tracking-wide">Book</span>
        <button onClick={() => onToggle(subject)} className="text-[10px]">N/A</button>
      </div>
    );
  }
  const met = subject.ebook_page_count > 0;
  return (
    <div className={`flex flex-col items-center gap-0.5 ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
      <span className="text-[10px] uppercase tracking-wide">Book</span>
      {met ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
      <span className="text-[10px]">{subject.ebook_page_count}pg</span>
    </div>
  );
}

function Check({
  label,
  checked,
  color,
  onChange,
}: {
  label: string;
  checked: boolean;
  color: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`h-5 w-5 cursor-pointer rounded ${color}`}
      />
      {label}
    </label>
  );
}
