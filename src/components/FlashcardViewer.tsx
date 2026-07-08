"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import NextImage from "next/image";
import type { Flashcard } from "@/lib/types";

const PASTEL_COLORS = [
  "bg-sky/30", "bg-leaf/30", "bg-coral/30", "bg-sun/30", "bg-purple/30",
];
const PLACEHOLDER_EMOJIS = [
  "🌟", "📖", "✏️", "🎨", "🔤", "🐣", "🦋", "🌈", "🍎", "🎵",
];

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  subjectTitle: string;
  subjectId: string;
  subjectSlug: string;
}

export function FlashcardViewer({
  flashcards, subjectTitle, subjectId, subjectSlug,
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>(() =>
    flashcards.map((_, i) => i)
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const [isSlow, setIsSlow] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("flashcard-speed") !== "normal";
    }
    return true;
  });

  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);

  const cardIndex = shuffledOrder[currentIndex];
  const card = flashcards[cardIndex];
  const total = flashcards.length;
  const bgColor = PASTEL_COLORS[cardIndex % PASTEL_COLORS.length];
  const emoji = PLACEHOLDER_EMOJIS[cardIndex % PLACEHOLDER_EMOJIS.length];

  // Preload adjacent card images + audio
  useEffect(() => {
    const adjacentIndices = [currentIndex - 1, currentIndex + 1];
    for (const i of adjacentIndices) {
      const wrappedI = i < 0 ? total - 1 : i >= total ? 0 : i;
      const ci = shuffledOrder[wrappedI];
      const fc = flashcards[ci];
      if (fc?.image_url) {
        const img = new window.Image();
        img.src = fc.image_url;
      }
      if (fc?.audio_url) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = fc.audio_url;
      }
    }
  }, [currentIndex, shuffledOrder, flashcards, total]);

  // Track card view
  useEffect(() => {
    if (!card) return;
    setViewedIds((prev) => { const n = new Set(prev); n.add(card.id); return n; });
    async function recordView() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("flashcard_progress").upsert(
          { child_id: user.id, subject_id: subjectId, flashcard_id: card.id },
          { onConflict: "child_id,flashcard_id" }
        );
      } catch { /* silent */ }
    }
    recordView();
  }, [card, subjectId]);

  useEffect(() => {
    if (viewedIds.size >= total && total > 0 && !showComplete) setShowComplete(true);
  }, [viewedIds.size, total, showComplete]);

  const goTo = useCallback((next: number) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setCurrentIndex(next);
  }, []);

  const goPrev = useCallback(() => {
    goTo(currentIndex === 0 ? total - 1 : currentIndex - 1);
  }, [currentIndex, total, goTo]);

  const goNext = useCallback(() => {
    goTo(currentIndex === total - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, total, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext]);

  // Swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext(); else goPrev();
    }
    touchStartRef.current = null;
  }, [goNext, goPrev]);

  const toggleShuffle = useCallback(() => {
    if (isShuffled) {
      setShuffledOrder(flashcards.map((_, i) => i));
      setCurrentIndex(0); setIsShuffled(false);
    } else {
      const order = flashcards.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      setShuffledOrder(order); setCurrentIndex(0); setIsShuffled(true);
    }
  }, [isShuffled, flashcards]);

  const toggleSpeed = useCallback(() => {
    setIsSlow((prev) => {
      const next = !prev;
      localStorage.setItem("flashcard-speed", next ? "slow" : "normal");
      if (audioRef.current) audioRef.current.playbackRate = next ? 0.75 : 1;
      return next;
    });
  }, []);

  const playAudio = useCallback(() => {
    if (!card.audio_url) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(card.audio_url);
    audio.playbackRate = isSlow ? 0.75 : 1;
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, [card.audio_url, isSlow]);

  const viewedCount = viewedIds.size;
  const progressPercent = total > 0 ? Math.round((viewedCount / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Top bar ── */}
      <div className="flex flex-shrink-0 items-center justify-between px-3 py-2 border-b border-gray-100">
        <Link href={`/learn/${subjectSlug}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-gray-600 active:scale-95 transition-transform">
          <span className="text-xl font-bold">✕</span>
        </Link>
        <div className="text-center">
          <p className="font-fredoka text-sm font-medium text-text-dark">{currentIndex + 1} of {total}</p>
          <p className="font-sarabun text-[10px] text-text-mid">{subjectTitle}</p>
        </div>
        <button onClick={toggleShuffle}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
            isShuffled ? "bg-coral/20 text-coral" : "text-text-mid hover:bg-gray-100"
          }`}>
          🔀
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 w-full bg-gray-100 flex-shrink-0">
        <div className={`h-full transition-all duration-500 ${progressPercent >= 100 ? "bg-leaf" : "bg-sky-dark"}`}
          style={{ width: `${progressPercent}%` }} />
      </div>

      {/* ── Completion banner ── */}
      {showComplete && (
        <div className="flex-shrink-0 bg-leaf/20 px-4 py-2 text-center">
          <p className="font-nunito text-sm font-bold text-leaf-dark">
            🎉 All cards viewed! / ดูบัตรทั้งหมดแล้ว!
          </p>
        </div>
      )}

      {/* ── Main image area (flex-1 takes remaining space) ── */}
      <div
        className="flex-1 flex items-center justify-center min-h-0 px-4 py-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col items-center w-full h-full">
          {/* Image */}
          <div className={`flex-1 flex items-center justify-center w-full min-h-0 rounded-2xl ${bgColor}`}>
            {card.image_url ? (
              <NextImage src={card.image_url} alt={card.word_en}
                width={400} height={400}
                className="max-w-full max-h-full object-contain rounded-xl p-2"
                sizes="(max-width: 448px) 100vw, 400px" />
            ) : (
              <span className="select-none text-8xl">{emoji}</span>
            )}
          </div>

          {/* Word display */}
          <div className="flex-shrink-0 text-center py-3">
            <p className="font-nunito text-3xl font-black text-text-dark">{card.word_en}</p>
            {card.word_th && (
              <p className="font-sarabun text-lg text-text-mid">{card.word_th}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom control bar ── */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {/* Speed toggle — pill switch with turtle/rabbit */}
        <div className="flex items-center justify-center mb-3">
          <button
            onClick={toggleSpeed}
            aria-label="Toggle speed"
            className="flex items-center rounded-full bg-sky-dark/10 p-1 transition-all"
          >
            <div className={`flex items-center justify-center w-16 h-10 rounded-full text-3xl transition-all duration-200 ${
              isSlow ? "bg-sky-dark shadow-md" : ""
            }`}>
              🐢
            </div>
            <div className={`flex items-center justify-center w-16 h-10 rounded-full text-3xl transition-all duration-200 ${
              !isSlow ? "bg-leaf shadow-md" : ""
            }`}>
              🐇
            </div>
          </button>
        </div>

        {/* Navigation + play */}
        <div className="flex items-center justify-center gap-3">
          {/* Previous */}
          <button onClick={goPrev} aria-label="Previous card"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-dark text-white shadow transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>

          {/* Play audio */}
          <button onClick={playAudio} disabled={!card.audio_url} aria-label="Play audio"
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-90 ${
              card.audio_url ? "bg-leaf text-white" : "bg-gray-200 text-gray-400"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </button>

          {/* Next */}
          <button onClick={goNext} aria-label="Next card"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-dark text-white shadow transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
