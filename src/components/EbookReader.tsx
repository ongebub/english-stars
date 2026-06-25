"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EbookPage } from "@/lib/types";

interface EbookReaderProps {
  pages: EbookPage[];
  subjectTitle: string;
  subjectId: string;
}

const PASTEL_COLORS = [
  "bg-sun/40", "bg-leaf/30", "bg-coral/30", "bg-sky-dark/20",
];

export function EbookReader({ pages, subjectTitle, subjectId }: EbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedRef = useRef(false);

  const page = pages[currentPage];
  const totalPages = pages.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  // Save progress to DB on page change
  useEffect(() => {
    async function saveProgress() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const isComplete = currentPage >= totalPages - 1;

        await supabase.from("ebook_progress").upsert(
          {
            child_id: user.id,
            subject_id: subjectId,
            last_page: currentPage + 1,
            completed: isComplete,
            ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "child_id,subject_id" }
        );

        if (isComplete && !savedRef.current) {
          savedRef.current = true;
          setShowComplete(true);
        }
      } catch {
        // Silent fail
      }
    }
    saveProgress();
  }, [currentPage, totalPages, subjectId]);

  const goToPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalPages) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsFading(true);
      setTimeout(() => {
        setCurrentPage(index);
        setIsFading(false);
      }, 200);
    },
    [totalPages]
  );

  const goNext = useCallback(() => {
    if (!isLastPage) goToPage(currentPage + 1);
  }, [currentPage, isLastPage, goToPage]);

  const goPrev = useCallback(() => {
    if (!isFirstPage) goToPage(currentPage - 1);
  }, [currentPage, isFirstPage, goToPage]);

  // Auto-play logic
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentPage((prev) => {
          if (prev >= totalPages - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          setIsFading(true);
          setTimeout(() => setIsFading(false), 200);
          return prev + 1;
        });
      }, 6000);
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [isAutoPlaying, totalPages]);

  useEffect(() => {
    if (isLastPage && isAutoPlaying) setIsAutoPlaying(false);
  }, [isLastPage, isAutoPlaying]);

  const playAudio = () => {
    if (!page.audio_url) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(page.audio_url);
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const pastelBg = PASTEL_COLORS[currentPage % PASTEL_COLORS.length];
  // Access emoji via type assertion since the column was added after initial types
  const pageEmoji = (page as EbookPage & { emoji?: string }).emoji;

  // Completion screen
  if (showComplete) {
    return (
      <div className="w-full max-w-[420px] mx-auto">
        <div className="rounded-xl bg-white shadow-lg overflow-hidden p-8 text-center">
          <div className="text-7xl mb-4 animate-bounce">🦉</div>
          <h2 className="font-nunito text-2xl font-black text-text-dark">
            You finished the book!
          </h2>
          <p className="font-sarabun text-lg text-text-mid mt-1">
            เก่งมาก! 🎉
          </p>
          <div className="mt-4 flex gap-1 justify-center text-4xl">
            <span>⭐</span><span>⭐</span><span>⭐</span>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => { setShowComplete(false); goToPage(0); savedRef.current = false; }}
              className="w-full rounded-xl py-3 font-bold text-white bg-leaf hover:bg-leaf-dark min-h-[48px]"
            >
              Read Again / <span className="font-sarabun">อ่านอีกครั้ง</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div className="rounded-xl bg-white shadow-lg overflow-hidden">
        {/* Title bar */}
        <div className="bg-sky-dark px-5 py-3">
          <h2 className="font-nunito text-base font-bold text-white text-center truncate">
            {subjectTitle} &middot; E-book
          </h2>
        </div>

        {/* Page content */}
        <div className={`transition-opacity duration-200 ${isFading ? "opacity-0" : "opacity-100"}`}>
          {/* Image area */}
          <div className="px-4 pt-4">
            {page.image_url ? (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.image_url} alt={`Page ${page.page_number}`} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className={`flex items-center justify-center w-full aspect-[4/3] rounded-xl ${pastelBg}`}>
                <span className="text-7xl">{pageEmoji || "📖"}</span>
              </div>
            )}
          </div>

          {/* Text content */}
          <div className="px-5 py-4 min-h-[120px]">
            <p className="font-nunito text-xl leading-relaxed text-text-dark">
              {page.text_en}
            </p>
          </div>
        </div>

        {/* Audio button */}
        <div className="flex justify-center pb-3">
          <button
            onClick={playAudio}
            disabled={!page.audio_url}
            className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 py-2 font-nunito text-sm font-bold transition-colors ${
              page.audio_url
                ? "bg-sun/40 text-text-dark hover:bg-sun/60 active:bg-sun/80"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <span className="text-lg">🔊</span>
            <span>Listen / <span className="font-sarabun">ฟัง</span></span>
          </button>
        </div>

        <div className="mx-5 border-t border-gray-100" />

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={goPrev} disabled={isFirstPage} aria-label="Previous page"
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-colors ${
              isFirstPage ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-sky-dark/10 text-sky-dark hover:bg-sky-dark/20"
            }`}
          >
            ◀️
          </button>

          <div className="text-center">
            <p className="font-nunito text-sm font-bold text-text-dark">Page {currentPage + 1} of {totalPages}</p>
            <p className="font-sarabun text-xs text-text-dark/60">หน้า {currentPage + 1} จาก {totalPages}</p>
          </div>

          <button
            onClick={goNext} disabled={isLastPage} aria-label="Next page"
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-colors ${
              isLastPage ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-sky-dark/10 text-sky-dark hover:bg-sky-dark/20"
            }`}
          >
            ▶️
          </button>
        </div>

        {/* Auto-play */}
        <div className="px-5 pb-5">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`w-full min-h-[48px] rounded-xl px-5 py-3 font-nunito text-sm font-bold transition-colors ${
              isAutoPlaying ? "bg-leaf text-white shadow-md" : "bg-leaf/20 text-text-dark hover:bg-leaf/30"
            }`}
          >
            {isAutoPlaying ? "⏸ " : "▶ "}
            Auto-play &middot; <span className="font-sarabun">เล่นอัตโนมัติ</span>
            {isAutoPlaying && <span className="ml-2 text-xs opacity-80">(ON)</span>}
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-sky-dark transition-all duration-500"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
