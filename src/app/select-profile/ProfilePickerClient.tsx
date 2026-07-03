"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { setActiveChild } from "@/lib/active-child";
import type { Profile } from "@/lib/types";

const AVATAR_GRID = [
  ["🐱", "🐶", "🐰", "🐼", "🐨", "🦊", "🐸", "🐯", "🦁", "🐮"],
  ["🧙", "🧚", "🦄", "🐉", "🧜", "🧝", "🦸", "🦹", "🧞", "🧟"],
  ["🍎", "🍦", "🍕", "🎂", "🍩", "🌮", "🍜", "🍇", "🍓", "🥝"],
  ["🌸", "🌈", "⭐", "🌙", "☀️", "🌊", "🔥", "⚡", "🌺", "🍀"],
  ["⚽", "🏀", "🎾", "🏊", "🚴", "🎮", "🎨", "🎵", "📚", "🚀"],
];

interface Props {
  childProfiles: Profile[];
}

export default function ProfilePickerClient({ childProfiles: children }: Props) {
  const router = useRouter();
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childEmoji, setChildEmoji] = useState("🐱");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function selectChild(child: Profile) {
    setActiveChild(
      child.id,
      child.display_name,
      child.avatar_emoji || "🧒",
      null
    );
    router.push("/learn");
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: childName,
          role: "child",
          avatar_emoji: childEmoji,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add child");
        return;
      }
      // Select the new child immediately
      setActiveChild(
        data.profile.id,
        data.profile.display_name,
        data.profile.avatar_emoji || childEmoji,
        null
      );
      router.push("/learn");
    } catch {
      setError("Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1565C0] via-sky-dark to-[#26C6DA] flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo-small.png"
            alt="English Allstars"
            width={200}
            height={200}
            priority
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-black text-white font-nunito">
            Who&apos;s Learning Today?
          </h1>
          <p className="text-white/90 font-sarabun text-xl mt-1">
            ใครกำลังเรียนวันนี้?
          </p>
        </div>

        {/* Profile cards grid */}
        <div className="grid grid-cols-2 gap-4">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => selectChild(child)}
              className="bg-white rounded-2xl p-6 shadow-lg flex flex-col items-center gap-3
                         hover:scale-105 hover:shadow-xl transition-all active:scale-95"
            >
              <span className="text-7xl leading-none">
                {child.avatar_emoji || "🧒"}
              </span>
              <span className="font-nunito text-lg font-bold text-text-dark truncate w-full text-center">
                {child.display_name}
              </span>
            </button>
          ))}

          {/* Add child card */}
          <button
            onClick={() => setShowAddChild(true)}
            className="bg-white/20 border-3 border-dashed border-white/50 rounded-2xl p-6
                       flex flex-col items-center justify-center gap-2
                       hover:bg-white/30 hover:border-white transition-all"
          >
            <span className="text-5xl text-white/80">+</span>
            <span className="font-nunito text-sm font-bold text-white/90">Add Child</span>
            <span className="font-sarabun text-xs text-white/70">เพิ่มเด็ก</span>
          </button>
        </div>

        {/* Add child modal */}
        {showAddChild && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="font-nunito text-xl font-bold text-text-dark text-center mb-1">
                Add a Child
              </h2>
              <p className="font-sarabun text-text-mid text-center text-sm mb-4">
                เพิ่มเด็ก
              </p>

              <form onSubmit={handleAddChild} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-dark mb-1 font-nunito">
                    Name <span className="font-sarabun text-text-mid font-normal">ชื่อ</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="e.g. Nong Ploy"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-text-dark
                               focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
                  />
                </div>

                {/* Avatar picker */}
                <div>
                  <p className="text-sm font-bold text-text-dark mb-2 font-nunito">
                    Choose Avatar <span className="font-sarabun text-text-mid font-normal">เลือกอวตาร</span>
                  </p>
                  <div className="space-y-1.5">
                    {AVATAR_GRID.map((row, ri) => (
                      <div key={ri} className="flex gap-1 justify-center">
                        {row.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setChildEmoji(emoji)}
                            className={`text-2xl p-1.5 rounded-lg transition-all min-w-[40px] min-h-[40px] ${
                              childEmoji === emoji
                                ? "bg-sky-dark/20 border-2 border-sky-dark scale-110 shadow"
                                : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="text-center mt-2 text-sm text-text-mid">
                    Selected: <span className="text-3xl">{childEmoji}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-coral/20 border-2 border-coral rounded-xl p-3 text-sm text-text-dark text-center">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddChild(false); setError(""); }}
                    className="flex-1 rounded-xl py-3 font-bold text-text-mid bg-gray-100 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 rounded-xl py-3 font-bold text-white bg-leaf hover:bg-leaf-dark disabled:opacity-50"
                  >
                    {adding ? "Adding..." : "Add & Start!"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
