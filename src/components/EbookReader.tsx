"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { EbookPage } from "@/lib/types";

interface EbookReaderProps {
  pages: EbookPage[];
  subjectTitle: string;
}

const PASTEL_COLORS = [
  "bg-sun/40",
  "bg-leaf/30",
  "bg-coral/30",
  "bg-sky-dark/20",
];

export function EbookReader({ pages, subjectTitle }: EbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const page = pages[currentPage];
  const totalPages = pages.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  const goToPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalPages) return;

      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Fade transition
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
      }, 5000);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [isAutoPlaying, totalPages]);

  // Stop auto-play at last page
  useEffect(() => {
    if (isLastPage && isAutoPlaying) {
      setIsAutoPlaying(false);
    }
  }, [isLastPage, isAutoPlaying]);

  const playAudio = () => {
    if (!page.audio_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(page.audio_url);
    audioRef.current = audio;
    audio.play().catch(() => {
      // Audio play failed (e.g. no user interaction yet)
    });
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const pastelBg = PASTEL_COLORS[currentPage % PASTEL_COLORS.length];

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Book container */}
      <div className="rounded-xl bg-white shadow-lg overflow-hidden">
        {/* Title bar */}
        <div className="bg-sky-dark px-5 py-3">
          <h2 className="font-nunito text-base font-bold text-white text-center truncate">
            {subjectTitle} &middot; E-book
          </h2>
        </div>

        {/* Page content area */}
        <div
          className={`transition-opacity duration-200 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Image area */}
          <div className="px-4 pt-4">
            {page.image_url ? (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-cream">
                <img
                  src={page.image_url}
                  alt={`Page ${page.page_number}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className={`flex items-center justify-center w-full aspect-[4/3] rounded-xl ${pastelBg}`}
              >
                <span className="text-7xl">📖</span>
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

        {/* Divider */}
        <div className="mx-5 border-t border-gray-100" />

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-4">
          {/* Previous button */}
          <button
            onClick={goPrev}
            disabled={isFirstPage}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-colors ${
              isFirstPage
                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-sky-dark/10 text-sky-dark hover:bg-sky-dark/20 active:bg-sky-dark/30"
            }`}
            aria-label="Previous page"
          >
            ◀️
          </button>

          {/* Page counter */}
          <div className="text-center">
            <p className="font-nunito text-sm font-bold text-text-dark">
              Page {currentPage + 1} of {totalPages}
            </p>
            <p className="font-sarabun text-xs text-text-dark/60">
              หน้า {currentPage + 1} จาก {totalPages}
            </p>
          </div>

          {/* Next button */}
          <button
            onClick={goNext}
            disabled={isLastPage}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-colors ${
              isLastPage
                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-sky-dark/10 text-sky-dark hover:bg-sky-dark/20 active:bg-sky-dark/30"
            }`}
            aria-label="Next page"
          >
            ▶️
          </button>
        </div>

        {/* Auto-play toggle */}
        <div className="px-5 pb-5">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`w-full min-h-[48px] rounded-xl px-5 py-3 font-nunito text-sm font-bold transition-colors ${
              isAutoPlaying
                ? "bg-leaf text-white shadow-md"
                : "bg-leaf/20 text-text-dark hover:bg-leaf/30"
            }`}
          >
            {isAutoPlaying ? "⏸ " : "▶ "}
            Auto-play &middot;{" "}
            <span className="font-sarabun">เล่นอัตโนมัติ</span>
            {isAutoPlaying && (
              <span className="ml-2 text-xs opacity-80">(ON)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
