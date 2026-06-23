"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Flashcard } from "@/lib/types";

/* ── Pastel backgrounds for placeholder cards ── */
const PASTEL_COLORS = [
  "bg-sky/30",
  "bg-leaf/30",
  "bg-coral/30",
  "bg-sun/30",
  "bg-purple/30",
];

/* ── Placeholder emojis when no image ── */
const PLACEHOLDER_EMOJIS = [
  "🌟",
  "📖",
  "✏️",
  "🎨",
  "🔤",
  "🐣",
  "🦋",
  "🌈",
  "🍎",
  "🎵",
];

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  subjectTitle: string;
}

export function FlashcardViewer({
  flashcards,
  subjectTitle,
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>(() =>
    flashcards.map((_, i) => i)
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left"
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // The actual index into the flashcards array
  const cardIndex = shuffledOrder[currentIndex];
  const card = flashcards[cardIndex];
  const total = flashcards.length;

  // Stable color and emoji per card (based on original index)
  const bgColor = PASTEL_COLORS[cardIndex % PASTEL_COLORS.length];
  const emoji = PLACEHOLDER_EMOJIS[cardIndex % PLACEHOLDER_EMOJIS.length];

  /* ── Navigation ── */
  const goTo = useCallback(
    (next: number, direction: "left" | "right") => {
      if (isTransitioning) return;
      setSlideDirection(direction);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(next);
        setIsTransitioning(false);
      }, 200);
    },
    [isTransitioning]
  );

  const goPrev = useCallback(() => {
    const prev = currentIndex === 0 ? total - 1 : currentIndex - 1;
    goTo(prev, "right");
  }, [currentIndex, total, goTo]);

  const goNext = useCallback(() => {
    const next = currentIndex === total - 1 ? 0 : currentIndex + 1;
    goTo(next, "left");
  }, [currentIndex, total, goTo]);

  /* ── Keyboard nav ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext]);

  /* ── Shuffle ── */
  const toggleShuffle = useCallback(() => {
    if (isShuffled) {
      // Reset to original order
      setShuffledOrder(flashcards.map((_, i) => i));
      setCurrentIndex(0);
      setIsShuffled(false);
    } else {
      // Fisher-Yates shuffle
      const order = flashcards.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      setShuffledOrder(order);
      setCurrentIndex(0);
      setIsShuffled(true);
    }
  }, [isShuffled, flashcards]);

  /* ── Audio ── */
  const playAudio = useCallback(() => {
    if (!card.audio_url) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(card.audio_url);
    audioRef.current = audio;
    audio.play().catch(() => {
      /* ignore autoplay blocks */
    });
  }, [card.audio_url]);

  /* ── Transition class ── */
  const transitionClass = isTransitioning
    ? slideDirection === "left"
      ? "opacity-0 -translate-x-4"
      : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      {/* Title */}
      <h1 className="font-nunito text-2xl font-extrabold text-text-dark">
        {subjectTitle} Flashcards
      </h1>

      {/* Card */}
      <div className="w-full rounded-xl bg-white p-5 shadow-lg">
        <div
          className={`transition-all duration-200 ease-in-out ${transitionClass}`}
        >
          {/* Image / Placeholder */}
          <div
            className={`flex min-h-[200px] items-center justify-center rounded-xl ${bgColor}`}
          >
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.word_en}
                className="max-h-[240px] rounded-lg object-contain"
              />
            ) : (
              <span className="select-none text-7xl">{emoji}</span>
            )}
          </div>

          {/* Words */}
          <div className="mt-5 text-center">
            <p className="font-nunito text-3xl font-black text-text-dark">
              {card.word_en}
            </p>
            {card.word_th && (
              <p className="mt-1 font-sarabun text-xl text-text-mid">
                {card.word_th}
              </p>
            )}
          </div>
        </div>

        {/* Audio button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={playAudio}
            disabled={!card.audio_url}
            aria-label="Play audio"
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors ${
              card.audio_url
                ? "bg-leaf text-white hover:bg-leaf-dark active:scale-95"
                : "cursor-not-allowed bg-gray-200 text-gray-400"
            }`}
          >
            🔊
          </button>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex w-full items-center justify-between">
        {/* Previous */}
        <button
          onClick={goPrev}
          aria-label="Previous card"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-dark text-xl text-white shadow-md transition-transform hover:scale-105 active:scale-95"
        >
          ◀️
        </button>

        {/* Counter */}
        <div className="text-center">
          <p className="font-nunito text-lg font-bold text-text-dark">
            {currentIndex + 1} of {total}
          </p>
          <p className="font-sarabun text-sm text-text-mid">
            {currentIndex + 1} จาก {total}
          </p>
        </div>

        {/* Next */}
        <button
          onClick={goNext}
          aria-label="Next card"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-dark text-xl text-white shadow-md transition-transform hover:scale-105 active:scale-95"
        >
          ▶️
        </button>
      </div>

      {/* Shuffle button */}
      <button
        onClick={toggleShuffle}
        className={`flex items-center gap-2 rounded-xl px-5 py-3 font-nunito text-sm font-bold shadow transition-colors ${
          isShuffled
            ? "bg-coral text-white hover:bg-coral-dark"
            : "bg-white text-text-dark hover:bg-gray-50"
        }`}
      >
        <span className="text-lg">🔀</span>
        <span>
          {isShuffled ? "Unshuffle" : "Shuffle"} /{" "}
          <span className="font-sarabun">
            {isShuffled ? "เรียงตามลำดับ" : "สุ่ม"}
          </span>
        </span>
      </button>
    </div>
  );
}
