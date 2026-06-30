"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { EbookPage } from "@/lib/types";

interface EbookReaderProps {
  pages: EbookPage[];
  subjectTitle: string;
  subjectId: string;
  subjectSlug: string;
}

const PASTEL_COLORS = ["bg-sun/40", "bg-leaf/30", "bg-coral/30", "bg-sky-dark/20"];

/**
 * Calculate estimated start time for each word based on character-weighted
 * distribution across the total audio duration. Longer words get more time.
 */
function calculateWordTimings(words: string[], duration: number) {
  const totalChars = words.reduce((sum, w) => sum + Math.max(w.length, 1), 0);
  let elapsed = 0;
  return words.map((word) => {
    const start = elapsed;
    const wordDuration = (Math.max(word.length, 1) / totalChars) * duration;
    elapsed += wordDuration;
    return { word, start, end: elapsed };
  });
}

export function EbookReader({ pages, subjectTitle, subjectId, subjectSlug }: EbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timingsRef = useRef<{ word: string; start: number; end: number }[]>([]);
  const savedRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);

  const page = pages[currentPage];
  const totalPages = pages.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;
  const pageEmoji = (page as EbookPage & { emoji?: string }).emoji;
  const pastelBg = PASTEL_COLORS[currentPage % PASTEL_COLORS.length];

  // Split text into words for highlighting
  const words = page.text_en.split(/\s+/).filter(Boolean);

  // Save progress
  useEffect(() => {
    async function saveProgress() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const isComplete = currentPage >= totalPages - 1;
        await supabase.from("ebook_progress").upsert(
          {
            child_id: user.id, subject_id: subjectId,
            last_page: currentPage + 1, completed: isComplete,
            ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "child_id,subject_id" }
        );
        if (isComplete && !savedRef.current) {
          savedRef.current = true;
          setShowComplete(true);
        }
      } catch { /* silent */ }
    }
    saveProgress();
  }, [currentPage, totalPages, subjectId]);

  // Reset highlight when page changes
  useEffect(() => {
    setHighlightIndex(-1);
    setIsPlaying(false);
  }, [currentPage]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
      audioRef.current = null;
    }
    setIsPlaying(false);
    setHighlightIndex(-1);
  }, []);

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !timingsRef.current.length) return;
    const t = audio.currentTime;
    const idx = timingsRef.current.findIndex((w) => t >= w.start && t < w.end);
    if (idx !== -1) setHighlightIndex(idx);
  }

  const goToPage = useCallback((index: number) => {
    if (index < 0 || index >= totalPages) return;
    stopAudio();
    setIsFading(true);
    setTimeout(() => { setCurrentPage(index); setIsFading(false); }, 200);
  }, [totalPages, stopAudio]);

  const goNext = useCallback(() => {
    if (!isLastPage) goToPage(currentPage + 1);
  }, [currentPage, isLastPage, goToPage]);

  const goPrev = useCallback(() => {
    if (!isFirstPage) goToPage(currentPage - 1);
  }, [currentPage, isFirstPage, goToPage]);

  // Swipe support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(diff) > 50) { if (diff < 0) goNext(); else goPrev(); }
    touchStartRef.current = null;
  }, [goNext, goPrev]);

  const playAudio = useCallback(() => {
    if (!page.audio_url) return;
    stopAudio();

    const audio = new Audio(page.audio_url);
    audioRef.current = audio;

    // When we know the duration, calculate word timings
    audio.addEventListener("loadedmetadata", () => {
      timingsRef.current = calculateWordTimings(words, audio.duration);
    });

    // Also handle case where duration is available immediately (cached audio)
    if (audio.duration && !isNaN(audio.duration)) {
      timingsRef.current = calculateWordTimings(words, audio.duration);
    }

    audio.addEventListener("timeupdate", handleTimeUpdate);

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      // Keep last word highlighted briefly, then clear
      setTimeout(() => setHighlightIndex(-1), 800);
    });

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {});
  }, [page.audio_url, words, stopAudio]);

  // Auto-play: play audio, then advance when audio ends
  useEffect(() => {
    if (!isAutoPlaying) return;

    function onEnded() {
      // Wait a beat then go to next page
      autoPlayRef.current = setTimeout(() => {
        setCurrentPage((prev) => {
          if (prev >= totalPages - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          setIsFading(true);
          setTimeout(() => setIsFading(false), 200);
          return prev + 1;
        });
      }, 1500) as unknown as ReturnType<typeof setInterval>;
    }

    // Play current page audio
    if (page.audio_url) {
      // Small delay to let state settle
      const t = setTimeout(() => {
        if (!audioRef.current || audioRef.current.paused) {
          playAudio();
        }
        if (audioRef.current) {
          audioRef.current.addEventListener("ended", onEnded, { once: true });
        }
      }, 300);
      return () => { clearTimeout(t); };
    } else {
      // No audio, just wait then advance
      autoPlayRef.current = setTimeout(onEnded, 4000) as unknown as ReturnType<typeof setInterval>;
    }

    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current as unknown as number);
    };
  }, [isAutoPlaying, currentPage, page.audio_url, totalPages, playAudio]);

  useEffect(() => {
    if (isLastPage && isAutoPlaying) setIsAutoPlaying(false);
  }, [isLastPage, isAutoPlaying]);

  // Cleanup
  useEffect(() => {
    return () => { stopAudio(); };
  }, [stopAudio]);

  // Completion screen
  if (showComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-6">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🦉</div>
          <h2 className="font-nunito text-3xl font-black text-text-dark">You finished the book!</h2>
          <p className="font-sarabun text-xl text-text-mid mt-2">เก่งมาก! 🎉</p>
          <div className="mt-4 flex gap-2 justify-center text-4xl">
            <span>⭐</span><span>⭐</span><span>⭐</span>
          </div>
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs mx-auto">
            <button onClick={() => { setShowComplete(false); goToPage(0); savedRef.current = false; }}
              className="min-h-[56px] rounded-2xl py-4 font-bold text-white bg-leaf active:scale-95 transition-transform shadow-lg">
              Read Again / <span className="font-sarabun">อ่านอีกครั้ง</span>
            </button>
            <Link href={`/learn/${subjectSlug}`}
              className="min-h-[48px] flex items-center justify-center rounded-xl bg-sky-dark px-6 py-3 font-nunito text-sm font-bold text-white">
              Back / <span className="font-sarabun ml-1">กลับ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <Link href={`/learn/${subjectSlug}`}
          className="flex h-10 w-10 items-center justify-center rounded-full text-sky-dark hover:bg-gray-100">
          <span className="text-xl">✕</span>
        </Link>
        <div className="text-center">
          <p className="font-nunito text-sm font-bold text-text-dark">
            Page {currentPage + 1} / {totalPages}
          </p>
          <p className="font-sarabun text-[10px] text-text-mid">{subjectTitle}</p>
        </div>
        <button onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${
            isAutoPlaying ? "bg-leaf/20 text-leaf" : "text-text-mid hover:bg-gray-100"
          }`}>
          {isAutoPlaying ? "⏸" : "▶"}
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 w-full bg-gray-100 flex-shrink-0">
        <div className="h-full bg-sky-dark transition-all duration-500"
          style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }} />
      </div>

      {/* ── Image area (takes ~60% of remaining space) ── */}
      <div className={`flex-[3] flex items-center justify-center min-h-0 transition-opacity duration-200 ${isFading ? "opacity-0" : "opacity-100"}`}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {page.image_url ? (
          <div className="w-full h-full flex items-center justify-center p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.image_url} alt={`Page ${page.page_number}`}
              className="max-w-full max-h-full object-contain rounded-2xl" />
          </div>
        ) : (
          <div className={`w-[85%] aspect-[4/3] flex items-center justify-center rounded-2xl ${pastelBg}`}>
            <span className="text-8xl">{pageEmoji || "📖"}</span>
          </div>
        )}
      </div>

      {/* ── Text panel with word highlighting ── */}
      <div className={`flex-[2] flex flex-col min-h-0 bg-white rounded-t-3xl -mt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] relative z-10 transition-opacity duration-200 ${isFading ? "opacity-0" : "opacity-100"}`}>
        {/* Text content - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2">
          <p className="font-nunito text-[19px] leading-[1.7] text-text-dark">
            {words.map((word, i) => (
              <span key={`${currentPage}-${i}`}>
                <span
                  className={`transition-all duration-150 rounded px-[2px] ${
                    i === highlightIndex
                      ? "text-[#0288D1] font-extrabold bg-sky-dark/10 scale-105 inline-block"
                      : i < highlightIndex && highlightIndex >= 0
                      ? "text-text-mid"
                      : "text-text-dark"
                  }`}
                >
                  {word}
                </span>
                {" "}
              </span>
            ))}
          </p>
        </div>

        {/* ── Bottom controls ── */}
        <div className="flex-shrink-0 flex items-center justify-around border-t border-gray-100 px-4 py-3"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          {/* Previous */}
          <button onClick={goPrev} disabled={isFirstPage} aria-label="Previous page"
            className={`flex h-14 w-14 items-center justify-center rounded-full text-xl transition-all active:scale-90 ${
              isFirstPage ? "bg-gray-100 text-gray-300" : "bg-sky-dark/10 text-sky-dark"
            }`}>
            ◀️
          </button>

          {/* Play audio - prominent center button */}
          <button onClick={playAudio} disabled={!page.audio_url} aria-label="Play audio"
            className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-all active:scale-90 ${
              isPlaying
                ? "bg-sun text-text-dark animate-pulse"
                : page.audio_url
                ? "bg-leaf text-white"
                : "bg-gray-200 text-gray-400"
            }`}>
            {isPlaying ? "🔊" : "▶️"}
          </button>

          {/* Next */}
          <button onClick={goNext} disabled={isLastPage} aria-label="Next page"
            className={`flex h-14 w-14 items-center justify-center rounded-full text-xl transition-all active:scale-90 ${
              isLastPage ? "bg-gray-100 text-gray-300" : "bg-sky-dark/10 text-sky-dark"
            }`}>
            ▶️
          </button>
        </div>
      </div>
    </div>
  );
}
