"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
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

  const goTo = useCallback((next: number, direction: "left" | "right") => {
    if (isTransitioning) return;
    setSlideDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => { setCurrentIndex(next); setIsTransitioning(false); }, 200);
  }, [isTransitioning]);

  const goPrev = useCallback(() => {
    goTo(currentIndex === 0 ? total - 1 : currentIndex - 1, "right");
  }, [currentIndex, total, goTo]);

  const goNext = useCallback(() => {
    goTo(currentIndex === total - 1 ? 0 : currentIndex + 1, "left");
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

  const transitionClass = isTransitioning
    ? slideDirection === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const viewedCount = viewedIds.size;
  const progressPercent = total > 0 ? Math.round((viewedCount / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Top bar ── */}
      <div className="flex flex-shrink-0 items-center justify-between px-3 py-2 border-b border-gray-100">
        <Link href={`/learn/${subjectSlug}`}
          className="flex h-10 w-10 items-center justify-center rounded-full text-sky-dark hover:bg-gray-100">
          <span className="text-xl">✕</span>
        </Link>
        <div className="text-center">
          <p className="font-nunito text-sm font-bold text-text-dark">{currentIndex + 1} / {total}</p>
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
        <div className={`flex flex-col items-center w-full h-full transition-all duration-200 ease-in-out ${transitionClass}`}>
          {/* Image */}
          <div className={`flex-1 flex items-center justify-center w-full min-h-0 rounded-2xl ${bgColor}`}>
            {card.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image_url} alt={card.word_en}
                className="max-w-full max-h-full object-contain rounded-xl p-2" />
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
      <div className="flex-shrink-0 flex items-center justify-around border-t border-gray-200 bg-white px-4 py-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        {/* Previous */}
        <button onClick={goPrev} aria-label="Previous card"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-dark text-xl text-white shadow active:scale-90 transition-transform">
          ◀️
        </button>

        {/* Audio */}
        <button onClick={playAudio} disabled={!card.audio_url} aria-label="Play audio"
          className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-transform active:scale-90 ${
            card.audio_url ? "bg-leaf text-white" : "bg-gray-200 text-gray-400"
          }`}>
          🔊
        </button>

        {/* Speed toggle */}
        <button onClick={toggleSpeed} aria-label="Toggle speed"
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all ${
            isSlow ? "bg-[#0288D1] text-white shadow" : "bg-gray-100 text-text-mid"
          }`}>
          {isSlow ? "🐢" : "🐇"}
        </button>

        {/* Next */}
        <button onClick={goNext} aria-label="Next card"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-dark text-xl text-white shadow active:scale-90 transition-transform">
          ▶️
        </button>
      </div>
    </div>
  );
}
