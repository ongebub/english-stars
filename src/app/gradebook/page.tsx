"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Profile, Subject, QuizAttempt } from "@/lib/types";

export default function GradebookPage() {
  const supabase = createClient();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile?.role === "parent") {
        const { data: kids } = await supabase
          .from("profiles")
          .select("*")
          .eq("parent_id", user.id);
        setChildren(kids || []);
        if (kids && kids.length > 0) {
          setSelectedChild(kids[0].id);
        }
      } else if (profile) {
        setChildren([profile]);
        setSelectedChild(profile.id);
      }

      const { data: subs } = await supabase
        .from("subjects")
        .select("*")
        .eq("is_published", true)
        .order("module")
        .order("sort_order");
      setSubjects(subs || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    async function loadAttempts() {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("child_id", selectedChild)
        .order("created_at", { ascending: false });
      setAttempts(data || []);
    }
    loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChild]);

  function getSubjectStats(subjectId: string) {
    const subjectAttempts = attempts.filter((a) => a.subject_id === subjectId);
    if (subjectAttempts.length === 0) return null;
    const bestScore = Math.max(...subjectAttempts.map((a) => a.score));
    const bestTotal = subjectAttempts.find((a) => a.score === bestScore)?.total || 10;
    const lastAttempt = subjectAttempts[0];
    const stars = bestScore >= 8 ? 3 : bestScore >= 5 ? 2 : 1;
    return {
      attempts: subjectAttempts.length,
      bestScore,
      bestTotal,
      lastDate: lastAttempt.completed_at || lastAttempt.created_at,
      stars,
      hasPerfect: bestScore === bestTotal,
      hasFirst: subjectAttempts.length >= 1,
      hasFiveAttempts: subjectAttempts.length >= 5,
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-bounce">🦉</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-dark to-[#26C6DA] text-white px-6 py-6"
        style={{ borderRadius: "0 0 24px 24px" }}>
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="text-white/80 text-sm mb-2 inline-block">← Dashboard · แดชบอร์ด</Link>
          <h1 className="text-2xl font-extrabold">📊 Gradebook · สมุดพก</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {/* Child selector */}
        {children.length > 1 && (
          <div className="mb-6">
            <label className="text-sm font-bold text-text-mid block mb-2">
              Select Child · เลือกเด็ก
            </label>
            <div className="flex gap-2 flex-wrap">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child.id)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                    selectedChild === child.id
                      ? "bg-sky-dark text-white"
                      : "bg-white text-text-dark border-2 border-gray-200"
                  }`}
                >
                  {child.avatar_emoji} {child.display_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedChild && children.length > 0 && (
          <p className="text-lg font-bold text-text-dark mb-4">
            {children.find((c) => c.id === selectedChild)?.avatar_emoji}{" "}
            {children.find((c) => c.id === selectedChild)?.display_name}&apos;s Progress
          </p>
        )}

        {/* Subject grades */}
        <div className="space-y-3">
          {subjects.map((subject) => {
            const stats = getSubjectStats(subject.id);
            return (
              <div key={subject.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{subject.emoji}</span>
                    <div>
                      <p className="font-bold text-text-dark text-sm">{subject.title_en}</p>
                      <p className="font-sarabun text-xs text-text-mid">{subject.title_th}</p>
                    </div>
                  </div>
                  {stats ? (
                    <div className="text-right">
                      <div className="text-sm">
                        {"⭐".repeat(stats.stars)}{"☆".repeat(3 - stats.stars)}
                      </div>
                      <p className="text-xs text-text-mid">
                        Best: {stats.bestScore}/{stats.bestTotal}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-text-light bg-gray-100 px-3 py-1 rounded-full">
                      Not started
                    </span>
                  )}
                </div>
                {stats && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-text-mid">
                    <span>📝 {stats.attempts} attempt{stats.attempts !== 1 ? "s" : ""}</span>
                    <span>📅 {new Date(stats.lastDate).toLocaleDateString()}</span>
                    <div className="flex gap-1 ml-auto">
                      {stats.hasFirst && <span title="First Quiz">🏆</span>}
                      {stats.hasPerfect && <span title="Perfect Score">🌟</span>}
                      {stats.hasFiveAttempts && <span title="5 Attempts">🔥</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {attempts.length === 0 && (
          <div className="text-center mt-8">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-text-mid font-semibold">No quiz attempts yet</p>
            <p className="font-sarabun text-sm text-text-light">ยังไม่มีการทำแบบทดสอบ</p>
            <Link href="/learn"
              className="mt-4 inline-block bg-sky-dark text-white font-bold px-6 py-3 rounded-xl">
              Start Learning · เริ่มเรียน
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
