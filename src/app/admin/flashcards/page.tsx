'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

const supabase = createClient();

type Subject = { id: string; title_en: string; emoji: string };

type Flashcard = {
  id: string;
  subject_id: string;
  word_en: string;
  word_th: string;
  image_url: string | null;
  audio_url: string | null;
  flagged: boolean;
  flag_notes: string | null;
};

const PAGE_SIZE = 30;

export default function FlashcardsAdminPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadSubjects() {
      const { data, error: err } = await supabase
        .from('subjects')
        .select('id, title_en, emoji')
        .order('sort_order');
      if (err) { setError(err.message); setLoading(false); return; }
      setSubjects(data as Subject[]);
      setLoading(false);
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) { setCards([]); setTotalCount(0); return; }
    async function loadCards() {
      setLoadingCards(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: err, count } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact' })
        .eq('subject_id', selectedSubjectId)
        .order('sort_order')
        .range(from, to);

      if (err) { setError(err.message); setLoadingCards(false); return; }
      setCards(data as Flashcard[]);
      setTotalCount(count ?? 0);
      setLoadingCards(false);
    }
    loadCards();
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

  async function toggleFlag(card: Flashcard) {
    const newVal = !card.flagged;
    const notes = newVal ? (prompt('Correction notes (what needs fixing):') || '') : null;
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, flagged: newVal, flag_notes: notes } : c)));
    await supabase.from('flashcards').update({ flagged: newVal, flag_notes: notes }).eq('id', card.id);
  }

  async function updateNotes(card: Flashcard, notes: string) {
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, flag_notes: notes } : c)));
    await supabase.from('flashcards').update({ flag_notes: notes }).eq('id', card.id);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading) return <main className="p-8 text-gray-500 dark:text-gray-400">Loading subjects...</main>;
  if (error) return <main className="p-8 text-red-600">Error: {error}</main>;

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-gradient-to-r from-sky-dark to-[#1565C0] text-white px-6 py-6"
        style={{ borderRadius: '0 0 24px 24px' }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-extrabold">Flashcards</h1>
          <p className="text-white/80 text-sm mt-1">Browse flashcard images and audio by subject</p>
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

        {/* Cards grid */}
        {loadingCards ? (
          <p className="text-gray-500 dark:text-gray-400">Loading flashcards...</p>
        ) : cards.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {totalCount} flashcards total &middot; Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, totalCount)}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {cards.map((card) => (
                <div key={card.id} className={`rounded-xl border shadow-sm overflow-hidden ${
                  card.flagged
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}>
                  {/* Image */}
                  {card.image_url ? (
                    <div className="relative aspect-square bg-gray-50 dark:bg-gray-700">
                      <Image
                        src={card.image_url}
                        alt={card.word_en}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 180px"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  )}
                  {/* Info */}
                  <div className="p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{card.word_en}</p>
                      <button
                        onClick={() => toggleFlag(card)}
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          card.flagged
                            ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                            : 'text-gray-400 hover:text-red-600'
                        }`}
                        title={card.flagged ? 'Unflag' : 'Flag for correction'}
                      >
                        {'\uD83D\uDEA9'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{card.word_th}</p>
                    {card.audio_url && (
                      <button
                        onClick={() => playAudio(card.audio_url!, card.id)}
                        className={`mt-1 rounded px-2 py-0.5 text-xs transition-colors ${
                          playingId === card.id
                            ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700'
                        }`}
                      >
                        {playingId === card.id ? '\u23F8' : '\u25B6'} Audio
                      </button>
                    )}
                    {card.flagged && (
                      <textarea
                        value={card.flag_notes || ''}
                        onChange={(e) => updateNotes(card, e.target.value)}
                        placeholder="Notes..."
                        className="mt-1 w-full rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                        rows={2}
                      />
                    )}
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
          <p className="text-gray-500 dark:text-gray-400">No flashcards found for this subject.</p>
        ) : null}
      </div>
    </div>
  );
}
