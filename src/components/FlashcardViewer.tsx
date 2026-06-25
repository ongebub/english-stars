"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
}

export function FlashcardViewer({
  flashcards,
  subjectTitle,
  subjectId,
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>(() =>
    flashcards.map((_, i) => i)
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSlow, setIsSlow] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("flashcard-speed") !== "normal";
    }
    return true;
  });

  // Completion tracking
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);

  const cardIndex = shuffledOrder[currentIndex];
  const card = flashcards[cardIndex];
  const total = flashcards.length;
  const bgColor = PASTEL_COLORS[cardIndex % PASTEL_COLORS.length];
  const emoji = PLACEHOLDER_EMOJIS[cardIndex % PLACEHOLDER_EMOJIS.length];

  // Track card view on each card change
  useEffect(() => {
    if (!card) return;
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });

    // Save to database
    async function recordView() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("flashcard_progress").upsert(
          {
            child_id: user.id,
            subject_id: subjectId,
            flashcard_id: card.id,
          },
          { onConflict: "child_id,flashcard_id" }
        );
      } catch {
        // Silent fail
      }
    }
    recordView();
  }, [card, subjectId]);

  // Check if all cards viewed
  useEffect(() => {
    if (viewedIds.size >= total && total > 0 && !showComplete) {
      setShowComplete(true);
    }
  }, [viewedIds.size, total, showComplete]);

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
      setShuffledOrder(flashcards.map((_, i) => i));
      setCurrentIndex(0);
      setIsShuffled(false);
    } else {
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

  /* ── Speed toggle ── */
  const toggleSpeed = useCallback(() => {
    setIsSlow((prev) => {
      const next = !prev;
      localStorage.setItem("flashcard-speed", next ? "slow" : "normal");
      if (audioRef.current) {
        audioRef.current.playbackRate = next ? 0.75 : 1;
      }
      return next;
    });
  }, []);

  /* ── Audio ── */
  const playAudio = useCallback(() => {
    if (!card.audio_url) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(card.audio_url);
    audio.playbackRate = isSlow ? 0.75 : 1;
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, [card.audio_url, isSlow]);

  const transitionClass = isTransitioning
    ? slideDirection === "left"
      ? "opacity-0 -translate-x-4"
      : "opacity-0 translate-x-4"
    : "opacity-100 translate-x-0";

  const viewedCount = viewedIds.size;
  const progressPercent = total > 0 ? Math.round((viewedCount / total) * 100) : 0;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      {/* Title */}
      <h1 className="font-nunito text-2xl font-extrabold text-text-dark">
        {subjectTitle} Flashcards
      </h1>

      {/* Completion celebration */}
      {showComplete && (
        <div className="w-full rounded-xl bg-leaf/20 border-2 border-leaf p-4 text-center animate-popIn">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-nunito font-bold text-text-dark">
            You viewed all the cards!
          </p>
          <p className="font-sarabun text-text-mid text-sm">
            คุณดูบัตรทั้งหมดแล้ว!
          </p>
        </div>
      )}

      {/* Card */}
      <div className="w-full rounded-xl bg-white p-5 shadow-lg">
        <div className={`transition-all duration-200 ease-in-out ${transitionClass}`}>
          <div className={`flex min-h-[200px] items-center justify-center rounded-xl ${bgColor}`}>
            {card.image_url ? (
              <img src={card.image_url} alt={card.word_en} className="max-h-[240px] rounded-lg object-contain" />
            ) : (
              <span className="select-none text-7xl">{emoji}</span>
            )}
          </div>
          <div className="mt-5 text-center">
            <p className="font-nunito text-3xl font-black text-text-dark">{card.word_en}</p>
            {card.word_th && (
              <p className="mt-1 font-sarabun text-xl text-text-mid">{card.word_th}</p>
            )}
          </div>
        </div>

        {/* Audio button */}
        <div className="mt-4 flex justify-center">
          <button onClick={playAudio} disabled={!card.audio_url} aria-label="Play audio"
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors ${
              card.audio_url ? "bg-leaf text-white hover:bg-leaf-dark active:scale-95" : "cursor-not-allowed bg-gray-200 text-gray-400"
            }`}>
            🔊
          </button>
        </div>

        {/* Speed toggle */}
        {card.audio_url && (
          <div className="mt-2 flex items-center justify-center gap-1">
            <button onClick={toggleSpeed}
              className={`flex h-9 items-center gap-1 rounded-full px-3 text-sm font-bold transition-all ${
                isSlow ? "bg-[#0288D1] text-white shadow-md" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}>
              <span className="text-base">🐢</span><span className="font-nunito">Slow</span>
            </button>
            <button onClick={toggleSpeed}
              className={`flex h-9 items-center gap-1 rounded-full px-3 text-sm font-bold transition-all ${
                !isSlow ? "bg-[#0288D1] text-white shadow-md" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}>
              <span className="text-base">🐇</span><span className="font-nunito">Normal</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex w-full items-center justify-between">
        <button onClick={goPrev} aria-label="Previous card"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-dark text-xl text-white shadow-md transition-transform hover:scale-105 active:scale-95">
          ◀️
        </button>
        <div className="text-center">
          <p className="font-nunito text-lg font-bold text-text-dark">{currentIndex + 1} of {total}</p>
          <p className="font-sarabun text-sm text-text-mid">{currentIndex + 1} จาก {total}</p>
        </div>
        <button onClick={goNext} aria-label="Next card"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-dark text-xl text-white shadow-md transition-transform hover:scale-105 active:scale-95">
          ▶️
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between text-xs text-text-mid mb-1">
          <span className="font-nunito">Seen: {viewedCount} of {total}</span>
          <span className="font-sarabun">ดูแล้ว {viewedCount} จาก {total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent >= 100 ? "bg-leaf" : "bg-sky-dark"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Shuffle button */}
      <button onClick={toggleShuffle}
        className={`flex items-center gap-2 rounded-xl px-5 py-3 font-nunito text-sm font-bold shadow transition-colors ${
          isShuffled ? "bg-coral text-white hover:bg-coral-dark" : "bg-white text-text-dark hover:bg-gray-50"
        }`}>
        <span className="text-lg">🔀</span>
        <span>
          {isShuffled ? "Unshuffle" : "Shuffle"} /{" "}
          <span className="font-sarabun">{isShuffled ? "เรียงตามลำดับ" : "สุ่ม"}</span>
        </span>
      </button>
    </div>
  );
}
