"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActiveChild } from "@/lib/active-child";
import { getSchoolSession } from "@/lib/school-session";

export interface SwitcherChild {
  id: string;
  name: string;
  emoji: string;
}

/**
 * Small header chip for parents: who is learning, and a way to switch.
 * Deliberately small and text-sized, not a button a young child taps by
 * accident. Sits where the Game/Tutor toggle will go (Phase 4); the real
 * parent-only gate also belongs to Phase 4.
 *
 * The list of kids comes from the server, so a stale active-child value left in
 * localStorage by a different login never shows the wrong name.
 */
export function ChildSwitcher({ kids }: { kids: SwitcherChild[] }) {
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [school, setSchool] = useState(false);

  useEffect(() => {
    setActiveId(getActiveChild()?.childId ?? null);
    setSchool(getSchoolSession() !== null);
    setReady(true);
  }, []);

  if (!ready || school) return null;

  const chip = "rounded-full bg-white/15 px-2.5 py-1 font-nunito text-xs font-semibold text-white hover:bg-white/25 whitespace-nowrap";

  if (kids.length === 0) {
    return <Link href="/select-profile" className={chip}>➕ Add child</Link>;
  }

  const active = kids.find((k) => k.id === activeId);
  if (!active) {
    return <Link href="/select-profile" className={chip}>👤 Choose child</Link>;
  }
  return (
    <Link href="/select-profile" className={chip} aria-label={`Learning as ${active.name}. Switch child`}>
      <span aria-hidden>{active.emoji}</span>{" "}
      <span className="inline-block max-w-[5rem] truncate align-bottom">{active.name}</span>
      {" · "}Switch
    </Link>
  );
}
