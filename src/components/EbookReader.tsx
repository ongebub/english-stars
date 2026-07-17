"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import NextImage from "next/image";
import type { EbookPage } from "@/lib/types";

interface EbookReaderProps {
  pages: EbookPage[];
  subjectTitle: string;
  subjectId: string;
  subjectSlug: string;
}

export function EbookReader({ pages, subjectTitle, subjectId, subjectSlug }: EbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isSlow, setIsSlow] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ebook-speed") !== "normal";
    }
    return true;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const autoPlayRef = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playAudioRef = useRef<() => void>(() => {});
  const savedRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);

  // Keep refs in sync so callbacks always see current values
  autoPlayRef.current = isAutoPlaying;

  const page = pages[currentPage];
  const totalPages = pages.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;
  const playbackRate = isSlow ? 0.75 : 1;

  // Preload ALL page images on mount so navigation is instant
  useEffect(() => {
    for (const p of pages) {
      if (p.image_url) {
        const img = new window.Image();
        img.src = p.image_url;
      }
      if (p.audio_url) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = p.audio_url;
      }
    }
  }, [pages]);

  const wordTimings = page.word_timings;
  const words = useMemo(() => {
    if (wordTimings && wordTimings.length > 0) {
      return wordTimings.map((wt) => wt.word);
    }
    return page.text_en.split(/\s+/).filter(Boolean);
  }, [wordTimings, page.text_en]);

  const indexAt = useCallback(
    (t: number) => {
      if (!wordTimings || wordTimings.length === 0) return -1;
      let lo = 0, hi = wordTimings.length - 1, ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (wordTimings[mid].start <= t) { ans = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      if (ans === wordTimings.length - 1 && ans >= 0 && t > wordTimings[ans].end + 0.15) return -1;
      return ans;
    },
    [wordTimings]
  );

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
        // Don't show completion screen here — wait until audio finishes on last page
        if (isComplete) savedRef.current = true;
      } catch { /* silent */ }
    }
    saveProgress();
  }, [currentPage, totalPages, subjectId]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback(() => {
    const tick = () => {
      const a = audioRef.current;
      if (!a) return;
      setHighlightIndex(indexAt(a.currentTime));
      rafRef.current = requestAnimationFrame(tick);
    };
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
  }, [indexAt, stopLoop]);

  useEffect(() => {
    setHighlightIndex(-1);
    setIsPlaying(false);
    stopLoop();
  }, [currentPage, stopLoop]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.onended = null; audioRef.current = null; }
    if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
    setIsPlaying(false);
    setHighlightIndex(-1);
    stopLoop();
  }, [stopLoop]);

  const goToPage = useCallback((index: number) => {
    if (index < 0 || index >= totalPages) return;
    stopAudio();
    setCurrentPage(index);
  }, [totalPages, stopAudio]);

  const goNext = useCallback(() => { if (!isLastPage) goToPage(currentPage + 1); }, [currentPage, isLastPage, goToPage]);
  const goPrev = useCallback(() => { if (!isFirstPage) goToPage(currentPage - 1); }, [currentPage, isFirstPage, goToPage]);

  const toggleSpeed = useCallback(() => {
    setIsSlow((prev) => {
      const next = !prev;
      localStorage.setItem("ebook-speed", next ? "slow" : "normal");
      if (audioRef.current) audioRef.current.playbackRate = next ? 0.75 : 1;
      return next;
    });
  }, []);

  // Auto-play toggle: if active and audio is playing, pause it in place.
  // If active and audio is paused, resume it. If not active, turn on auto-play.
  const toggleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      const a = audioRef.current;
      if (a && !a.paused) {
        // Pause audio and highlighting in place
        a.pause();
        setIsPlaying(false);
        stopLoop();
      } else if (a && a.paused) {
        // Resume from where we left off
        a.play().then(() => {
          setIsPlaying(true);
          if (wordTimings && wordTimings.length > 0) startLoop();
        }).catch(() => {});
      } else {
        // No audio ref (between pages) — turn off auto-play
        setIsAutoPlaying(false);
      }
    } else {
      setIsAutoPlaying(true);
    }
  }, [isAutoPlaying, wordTimings, startLoop, stopLoop]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartRef.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(diff) > 50) { if (diff < 0) goNext(); else goPrev(); }
    touchStartRef.current = null;
  }, [goNext, goPrev]);

  // Core audio play — handles both manual play and auto-play advancing
  const playAudio = useCallback(() => {
    if (!page.audio_url) return;
    stopAudio();
    const audio = new Audio(page.audio_url);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.onended = () => {
      // Brief highlight on last word then clear
      setHighlightIndex(words.length - 1);
      setTimeout(() => {
        setIsPlaying(false);
        setHighlightIndex(-1);
        stopLoop();

        // Show completion screen after last page audio finishes
        if (currentPage >= totalPages - 1) {
          setShowComplete(true);
          return;
        }
      }, 600);

      // Auto-advance: check the ref (always current) not the stale closure
      if (autoPlayRef.current && currentPage < totalPages - 1) {
        autoAdvanceTimer.current = setTimeout(() => {
          setCurrentPage((prev) => {
            if (prev >= totalPages - 1) {
              setIsAutoPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        }, 1200);
      }
    };

    audio.play().then(() => {
      setIsPlaying(true);
      if (wordTimings && wordTimings.length > 0) startLoop();
    }).catch(() => {});
  }, [page.audio_url, words.length, wordTimings, playbackRate, totalPages, currentPage, stopAudio, startLoop, stopLoop]);

  // Keep playAudio ref in sync so auto-play effect always calls the latest version
  playAudioRef.current = playAudio;

  // When auto-play is on and the page changes, start playing the new page
  useEffect(() => {
    if (!isAutoPlaying) return;
    // Small delay so the fade transition finishes
    const t = setTimeout(() => {
      if (autoPlayRef.current) playAudioRef.current();
    }, 400);
    return () => clearTimeout(t);
  }, [isAutoPlaying, currentPage]);

  const jumpTo = useCallback((i: number) => {
    if (!wordTimings || !wordTimings[i]) return;
    const a = audioRef.current;
    if (!a) {
      if (!page.audio_url) return;
      const audio = new Audio(page.audio_url);
      audio.playbackRate = playbackRate;
      audioRef.current = audio;
      audio.onended = () => {
        setHighlightIndex(words.length - 1);
        setTimeout(() => { setIsPlaying(false); setHighlightIndex(-1); stopLoop(); }, 600);
      };
      audio.currentTime = wordTimings[i].start + 0.001;
      audio.play().then(() => { setIsPlaying(true); startLoop(); }).catch(() => {});
      return;
    }
    a.currentTime = wordTimings[i].start + 0.001;
    if (a.paused) {
      a.play().then(() => { setIsPlaying(true); startLoop(); }).catch(() => {});
    }
  }, [wordTimings, page.audio_url, words.length, playbackRate, startLoop, stopLoop]);

  // Don't turn off auto-play on last page — let audio finish and show completion
  useEffect(() => { return () => { stopAudio(); }; }, [stopAudio]);

  // Completion screen
  if (showComplete) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-gray-900 px-6 transition-colors">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🦉</div>
          <h2 className="font-fredoka text-3xl font-semibold text-text-dark dark:text-gray-100">You finished the book!</h2>
          <p className="font-sarabun text-xl text-text-mid dark:text-gray-400 mt-2">เก่งมาก! 🎉</p>
          <div className="mt-4 flex gap-2 justify-center text-4xl">
            <span>⭐</span><span>⭐</span><span>⭐</span>
          </div>
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs mx-auto">
            <button onClick={() => { setShowComplete(false); goToPage(0); savedRef.current = false; }}
              className="min-h-[56px] rounded-2xl py-4 text-white bg-leaf active:scale-95 transition-transform shadow-lg font-fredoka text-lg font-medium">
              Read Again / <span className="font-sarabun">อ่านอีกครั้ง</span>
            </button>
            <Link href={`/learn/${subjectSlug}`}
              className="min-h-[48px] flex items-center justify-center rounded-xl bg-sky-dark px-6 py-3 font-fredoka font-medium text-white">
              Back / <span className="font-sarabun ml-1">กลับ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-gray-900 transition-colors">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 pb-2 border-b border-gray-100 dark:border-gray-700"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}>
        <Link href={`/learn/${subjectSlug}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 text-gray-600 active:scale-95 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </Link>
        <div className="text-center">
          <p className="font-fredoka text-sm font-medium text-text-dark dark:text-gray-100">
            Page {currentPage + 1} of {totalPages}
          </p>
          <p className="font-sarabun text-[10px] text-text-mid dark:text-gray-400">{subjectTitle}</p>
        </div>
        <div className="w-9" /> {/* spacer to balance close button */}
      </div>

      {/* Progress dots */}
      <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2">
        {pages.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentPage
                ? "w-6 h-2 bg-sky-dark"
                : i < currentPage
                ? "w-2 h-2 bg-sky-dark/40"
                : "w-2 h-2 bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Main content — image + text share same max-width */}
      <div
        className="flex-1 flex flex-col items-center min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image — near-fixed size, takes ~55% of available space */}
        <div className="flex-shrink-0 flex items-center justify-center w-full max-w-md px-4 pt-1" style={{ height: "55%" }}>
          {page.image_url ? (
            <NextImage
              src={page.image_url}
              alt={`Page ${page.page_number}`}
              width={512}
              height={512}
              priority={currentPage === 0}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-md"
              sizes="(max-width: 448px) 100vw, 448px"
            />
          ) : (
            <div className="w-[80%] aspect-square flex items-center justify-center rounded-2xl bg-sun/40">
              <span className="text-8xl">📖</span>
            </div>
          )}
        </div>

        {/* Text — scrollable if too long */}
        <div className="flex-1 min-h-0 w-full max-w-md px-4 py-2 overflow-y-auto scrollbar-hide">
          <div className="mx-auto">
            <p className="font-fredoka text-[22px] font-medium leading-[1.8] text-center select-none">
              {words.map((word, i) => (
                <span key={`${currentPage}-${i}`}>
                  <span
                    onClick={() => jumpTo(i)}
                    className={`cursor-pointer rounded-md px-[3px] py-[1px] transition-colors duration-100 ${
                      i === highlightIndex
                        ? "bg-sky/30 text-sky-dark dark:bg-sky-dark/30 dark:text-sky"
                        : i < highlightIndex && highlightIndex >= 0
                        ? "text-text-light dark:text-gray-600"
                        : "text-text-dark dark:text-gray-100"
                    }`}
                  >
                    {word}
                  </span>
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div
        className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-4 py-3"
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

        {/* Navigation + play + auto */}
        <div className="flex items-center justify-center gap-3">
          {/* Previous */}
          <button onClick={goPrev} disabled={isFirstPage} aria-label="Previous page"
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all active:scale-90 ${
              isFirstPage
                ? "bg-gray-200 text-gray-400"
                : "bg-sky-dark text-white shadow active:bg-sky-dark/80"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>

          {/* Play / Pause */}
          <button onClick={() => {
            const a = audioRef.current;
            if (a && !a.paused) {
              a.pause();
              setIsPlaying(false);
              stopLoop();
            } else if (a && a.paused && a.currentTime > 0) {
              a.play().then(() => {
                setIsPlaying(true);
                if (wordTimings && wordTimings.length > 0) startLoop();
              }).catch(() => {});
            } else {
              playAudio();
            }
          }} disabled={!page.audio_url} aria-label="Play audio"
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-90 ${
              isPlaying
                ? "bg-sun text-text-dark"
                : page.audio_url
                ? "bg-leaf text-white"
                : "bg-gray-200 text-gray-400"
            }`}>
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          {/* Auto-read: toggles auto-play, and pauses/resumes audio when active */}
          <button onClick={toggleAutoPlay} aria-label="Auto-read"
            className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all active:scale-90 ${
              isAutoPlaying
                ? "bg-coral text-white"
                : "bg-purple/30 text-purple-dark"
            }`}>
            {isAutoPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
            )}
          </button>

          {/* Next */}
          <button onClick={goNext} disabled={isLastPage} aria-label="Next page"
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all active:scale-90 ${
              isLastPage
                ? "bg-gray-200 text-gray-400"
                : "bg-sky-dark text-white shadow active:bg-sky-dark/80"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
