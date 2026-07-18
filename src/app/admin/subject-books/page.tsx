'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

const supabase = createClient();

type Subject = { id: string; title_en: string; emoji: string };

type EbookPage = {
  id: string;
  subject_id: string;
  page_number: number;
  text_en: string;
  image_url: string | null;
  audio_url: string | null;
};

const PAGE_SIZE = 10;

export default function SubjectBooksPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [pages, setPages] = useState<EbookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPages, setLoadingPages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadSubjects() {
      // Get distinct subject_ids from ebook_pages
      const { data, error: err } = await supabase
        .from('ebook_pages')
        .select('subject_id');
      if (err) { setError(err.message); setLoading(false); return; }

      const ids = Array.from(new Set((data ?? []).map((r: { subject_id: string }) => r.subject_id)));
      if (ids.length === 0) { setLoading(false); return; }

      const { data: subData, error: sErr } = await supabase
        .from('subjects')
        .select('id, title_en, emoji')
        .in('id', ids)
        .order('sort_order');
      if (sErr) { setError(sErr.message); setLoading(false); return; }
      setSubjects(subData as Subject[]);
      setLoading(false);
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) { setPages([]); setTotalCount(0); return; }
    async function loadPages() {
      setLoadingPages(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: err, count } = await supabase
        .from('ebook_pages')
        .select('*', { count: 'exact' })
        .eq('subject_id', selectedSubjectId)
        .order('page_number')
        .range(from, to);

      if (err) { setError(err.message); setLoadingPages(false); return; }
      setPages(data as EbookPage[]);
      setTotalCount(count ?? 0);
      setLoadingPages(false);
    }
    loadPages();
  }, [selectedSubjectId, page]);

  function playAudio(url: string, id: string) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingId === id) { setPlayingId(null); return; }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(id);
    audio.onended = () => { setPlayingId(null); audioRef.current = null; };
    audio.onerror = () => { setPlayingId(null); audioRef.current = null; };
    audio.play();
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading) return <main className="p-8 text-gray-500 dark:text-gray-400">Loading subjects...</main>;
  if (error) return <main className="p-8 text-red-600">Error: {error}</main>;

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-gradient-to-r from-sky-dark to-[#1565C0] text-white px-6 py-6"
        style={{ borderRadius: '0 0 24px 24px' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-extrabold">Subject Storybooks</h1>
          <p className="text-white/80 text-sm mt-1">Browse ebook pages by subject</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {/* Subject filter */}
        <select
          value={selectedSubjectId}
          onChange={(e) => { setSelectedSubjectId(e.target.value); setPage(0); }}
          className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-6"
        >
          <option value="">Select a subject...</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.emoji} {s.title_en}</option>
          ))}
        </select>

        {/* Pages list */}
        {loadingPages ? (
          <p className="text-gray-500 dark:text-gray-400">Loading pages...</p>
        ) : pages.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {totalCount} pages total &middot; Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, totalCount)}
            </p>
            <div className="space-y-4">
              {pages.map((p) => (
                <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <div className="flex gap-4">
                    {/* Image */}
                    {p.image_url && (
                      <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700">
                        <Image
                          src={p.image_url}
                          alt={`Page ${p.page_number}`}
                          fill
                          sizes="128px"
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )}
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                          Page {p.page_number}
                        </span>
                        {p.audio_url && (
                          <button
                            onClick={() => playAudio(p.audio_url!, p.id)}
                            className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                              playingId === p.id
                                ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700'
                            }`}
                          >
                            {playingId === p.id ? '\u23F8 Pause' : '\u25B6 Play'}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">
                        {p.text_en}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : selectedSubjectId ? (
          <p className="text-gray-500 dark:text-gray-400">No ebook pages found for this subject.</p>
        ) : null}
      </div>
    </div>
  );
}
