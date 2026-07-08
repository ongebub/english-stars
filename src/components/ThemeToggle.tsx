"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ variant = "dark-bg" }: { variant?: "dark-bg" | "light-bg" }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  // On blue nav: white text, hover white/10
  // On white nav: dark text, hover black/5
  const isOnBlueBg = variant === "dark-bg";

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`flex flex-col items-center justify-center rounded-xl px-3 py-1.5 min-h-[44px] transition-colors ${
        isOnBlueBg ? "hover:bg-white/10" : "hover:bg-black/5"
      }`}
    >
      <span className="text-lg">{dark ? "☀️" : "🌙"}</span>
      <span className={`font-sarabun text-[10px] ${
        isOnBlueBg ? "text-white/80" : "text-text-mid"
      }`}>
        {dark ? "สว่าง" : "มืด"}
      </span>
    </button>
  );
}
