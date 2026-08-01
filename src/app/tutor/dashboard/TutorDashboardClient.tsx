"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Student {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
  created_at: string;
}

interface InviteCode {
  code: string;
  created_at: string;
  revoked: boolean;
}

interface Props {
  seatCount: number;
  periodEnd: string | null;
  isTrialing: boolean;
  trialEnd: string | null;
  students: Student[];
  inviteCodes: InviteCode[];
}

export default function TutorDashboardClient({
  seatCount,
  periodEnd,
  isTrialing,
  trialEnd,
  students: initialStudents,
  inviteCodes: initialCodes,
}: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [codes, setCodes] = useState(initialCodes);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Per-student gradebook state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentGradebook, setStudentGradebook] = useState<{
    subjects: { id: string; title_en: string; title_th: string; emoji: string }[];
    attempts: { subject_id: string; score: number; total: number; completed_at: string; created_at: string }[];
    trophies: { trophy_type: string; subject_id: string | null; earned_at: string }[];
    lastActive: string | null;
  } | null>(null);
  const [gradebookLoading, setGradebookLoading] = useState(false);

  const trialEndDate = trialEnd
    ? new Date(trialEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const nextBilling = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  const loadStudentGradebook = useCallback(async (studentId: string) => {
    setGradebookLoading(true);
    setSelectedStudentId(studentId);
    const supabase = createClient();

    const [subjectsRes, attemptsRes, trophiesRes] = await Promise.all([
      supabase
        .from("subjects")
        .select("id, title_en, title_th, emoji")
        .eq("is_published", true)
        .order("module")
        .order("sort_order"),
      supabase
        .from("quiz_attempts")
        .select("subject_id, score, total, completed_at, created_at")
        .eq("child_id", studentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("trophies")
        .select("trophy_type, subject_id, earned_at")
        .eq("child_id", studentId),
    ]);

    const attempts = attemptsRes.data || [];
    const lastActive = attempts.length > 0 ? attempts[0].created_at : null;

    setStudentGradebook({
      subjects: subjectsRes.data || [],
      attempts,
      trophies: trophiesRes.data || [],
      lastActive,
    });
    setGradebookLoading(false);
  }, []);

  // Load gradebook when student is selected
  useEffect(() => {
    if (selectedStudentId) {
      loadStudentGradebook(selectedStudentId);
    }
  }, [selectedStudentId, loadStudentGradebook]);

  function getStudentSubjectStats(subjectId: string) {
    if (!studentGradebook) return null;
    const subjectAttempts = studentGradebook.attempts.filter((a) => a.subject_id === subjectId);
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
    };
  }

  async function generateCode() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/tutor/invite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not generate code");
        return;
      }
      setCodes((prev) => [
        { code: data.code, created_at: new Date().toISOString(), revoked: false },
        ...prev,
      ]);
    } catch {
      setError("Something went wrong. กรุณาลองใหม่");
    } finally {
      setGenerating(false);
    }
  }

  async function revokeCode(code: string) {
    setError("");
    try {
      const res = await fetch("/api/tutor/revoke-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not revoke code");
        return;
      }
      setCodes((prev) =>
        prev.map((c) => (c.code === code ? { ...c, revoked: true } : c))
      );
    } catch {
      setError("Something went wrong. กรุณาลองใหม่");
    }
  }

  async function removeStudent(studentId: string) {
    setError("");
    try {
      const res = await fetch("/api/tutor/remove-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_user_id: studentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not remove student");
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch {
      setError("Something went wrong. กรุณาลองใหม่");
    }
  }

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyJoinLink(code: string) {
    const url = `${siteUrl}/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(`link-${code}`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const activeCodes = codes.filter((c) => !c.revoked);
  const revokedCodes = codes.filter((c) => c.revoked);

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900 px-4 py-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-text-dark dark:text-gray-100 font-nunito">
            Tutor Dashboard
          </h1>
          <p className="text-text-mid dark:text-gray-400 font-sarabun mt-1">
            แดชบอร์ดติวเตอร์
          </p>
        </div>

        {/* Subscription summary */}
        <div className="bg-sky-dark/10 border-2 border-sky-dark/30 rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="font-nunito">
              <span className="font-bold text-text-dark">Tutor plan</span>
              <span className="text-text-mid mx-2">&middot;</span>
              <span className="text-sky-dark font-bold">{seatCount} seats</span>
              <span className="text-text-mid mx-2">&middot;</span>
              {isTrialing ? (
                <span className="text-sun-dark font-bold text-sm">
                  Trial ends: {trialEndDate || nextBilling}
                </span>
              ) : (
                <span className="text-text-mid text-sm">
                  Next billing: {nextBilling}
                </span>
              )}
            </div>
            <Link
              href="/settings/billing"
              className="bg-sky-dark text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-sky-dark/90 transition-colors min-h-[40px]"
            >
              Manage / จัดการ
            </Link>
          </div>
          {isTrialing && (
            <p className="font-nunito text-sun-dark text-sm font-bold mt-2">
              Free trial active / ทดลองใช้ฟรี
            </p>
          )}
          <p className="font-sarabun text-text-mid text-sm mt-1">
            แพลนติวเตอร์ &middot; {seatCount} ที่นั่ง &middot;{" "}
            {isTrialing
              ? `ทดลองใช้ถึง: ${trialEndDate || nextBilling}`
              : `เรียกเก็บถัดไป: ${nextBilling}`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Usage summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-black text-leaf">{students.length}</div>
            <p className="text-xs text-text-mid dark:text-gray-400 font-nunito">
              Active Students / นักเรียนที่ใช้งาน
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-black text-sky-dark">{seatCount}</div>
            <p className="text-xs text-text-mid dark:text-gray-400 font-nunito">
              Total Seats / จำนวนที่นั่งทั้งหมด
            </p>
          </div>
        </div>

        {/* Active students table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-text-dark dark:text-gray-100 font-nunito mb-4">
            Active Students{" "}
            <span className="font-sarabun text-text-mid dark:text-gray-400 font-normal text-base">
              นักเรียนที่ใช้งาน
            </span>
          </h2>

          {students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">👋</p>
              <p className="text-text-mid font-nunito">No students yet</p>
              <p className="text-text-light font-sarabun text-sm">
                Generate an invite code below and share the join link with your students.
              </p>
              <p className="text-text-light font-sarabun text-xs mt-1">
                สร้างรหัสเชิญด้านล่างแล้วแชร์ลิงก์เข้าร่วมให้นักเรียน
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`p-3 rounded-xl transition-colors ${
                    selectedStudentId === student.id
                      ? "bg-sky-dark/10 border-2 border-sky-dark/30"
                      : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {student.avatar_emoji || "🧒"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text-dark dark:text-gray-100 font-nunito truncate">
                        {student.display_name}
                      </p>
                      <p className="text-xs text-text-mid dark:text-gray-400">
                        Joined:{" "}
                        {new Date(student.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSelectedStudentId(
                          selectedStudentId === student.id ? null : student.id
                        )
                      }
                      className="bg-sky-dark/10 text-sky-dark font-bold px-3 py-2 rounded-xl text-xs hover:bg-sky-dark/20 transition-colors min-h-[36px]"
                    >
                      {selectedStudentId === student.id ? "Hide" : "Progress"}
                    </button>
                    <button
                      onClick={() => removeStudent(student.id)}
                      className="bg-red-50 dark:bg-red-500/10 text-red-500 font-bold px-3 py-2 rounded-xl text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors min-h-[36px]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-student gradebook */}
        {selectedStudentId && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-dark dark:text-gray-100 font-nunito">
                {students.find((s) => s.id === selectedStudentId)?.avatar_emoji || "🧒"}{" "}
                {students.find((s) => s.id === selectedStudentId)?.display_name}&apos;s Progress{" "}
                <span className="font-sarabun text-text-mid font-normal text-base">
                  ความก้าวหน้า
                </span>
              </h2>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="text-text-mid hover:text-text-dark text-sm font-bold px-3 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[36px]"
              >
                Close
              </button>
            </div>

            {gradebookLoading ? (
              <div className="text-center py-8">
                <div className="text-4xl animate-bounce">🦉</div>
                <p className="text-text-mid text-sm mt-2">Loading progress...</p>
              </div>
            ) : studentGradebook && studentGradebook.attempts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">📭</p>
                <p className="text-text-mid font-nunito font-bold">No quiz attempts yet</p>
                <p className="text-text-light font-sarabun text-sm">
                  This student hasn&apos;t taken any quizzes yet.
                </p>
                <p className="text-text-light font-sarabun text-xs mt-1">
                  นักเรียนยังไม่ได้ทำแบบทดสอบ
                </p>
              </div>
            ) : studentGradebook ? (
              <div>
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-leaf/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-leaf">
                      {studentGradebook.subjects.filter((s) =>
                        studentGradebook.attempts.some((a) => a.subject_id === s.id)
                      ).length}
                    </div>
                    <p className="text-xs text-text-mid font-nunito">Subjects</p>
                  </div>
                  <div className="bg-sky-dark/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-sky-dark">
                      {studentGradebook.attempts.length}
                    </div>
                    <p className="text-xs text-text-mid font-nunito">Attempts</p>
                  </div>
                  <div className="bg-sun/20 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-sun-dark">
                      {studentGradebook.trophies.length}
                    </div>
                    <p className="text-xs text-text-mid font-nunito">Trophies</p>
                  </div>
                </div>

                {studentGradebook.lastActive && (
                  <p className="text-xs text-text-mid mb-4">
                    Last active:{" "}
                    {new Date(studentGradebook.lastActive).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}

                {/* Subject breakdown */}
                <div className="space-y-2">
                  {studentGradebook.subjects.map((subject) => {
                    const stats = getStudentSubjectStats(subject.id);
                    if (!stats) return null;
                    return (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{subject.emoji}</span>
                          <div>
                            <p className="font-bold text-text-dark dark:text-gray-100 text-sm font-nunito">
                              {subject.title_en}
                            </p>
                            <p className="font-sarabun text-xs text-text-mid dark:text-gray-400">
                              {subject.title_th}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {"⭐".repeat(stats.stars)}
                            {"☆".repeat(3 - stats.stars)}
                          </div>
                          <p className="text-xs text-text-mid dark:text-gray-400">
                            Best: {stats.bestScore}/{stats.bestTotal} &middot;{" "}
                            {stats.attempts} attempt{stats.attempts !== 1 ? "s" : ""}
                          </p>
                          {stats.hasPerfect && (
                            <span className="text-xs text-leaf font-bold">Perfect!</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Subjects not yet attempted */}
                  {studentGradebook.subjects.filter(
                    (s) => !studentGradebook.attempts.some((a) => a.subject_id === s.id)
                  ).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-text-light dark:text-gray-500 mb-2 font-nunito">
                        Not started yet:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {studentGradebook.subjects
                          .filter(
                            (s) =>
                              !studentGradebook.attempts.some(
                                (a) => a.subject_id === s.id
                              )
                          )
                          .map((s) => (
                            <span
                              key={s.id}
                              className="text-xs bg-gray-100 dark:bg-gray-600 text-text-light dark:text-gray-400 px-2 py-1 rounded-lg"
                            >
                              {s.emoji} {s.title_en}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Invite codes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-dark dark:text-gray-100 font-nunito">
              Invite Codes{" "}
              <span className="font-sarabun text-text-mid dark:text-gray-400 font-normal text-base">
                รหัสเชิญ
              </span>
            </h2>
            <button
              onClick={generateCode}
              disabled={generating}
              className="bg-leaf text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-leaf-dark transition-colors disabled:opacity-50 min-h-[40px]"
            >
              {generating ? "Generating..." : "+ New Code / รหัสใหม่"}
            </button>
          </div>

          {activeCodes.length === 0 && revokedCodes.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-text-mid font-nunito text-sm">
                No invite codes yet. Generate one to get started.
              </p>
              <p className="text-text-light font-sarabun text-xs">
                ยังไม่มีรหัสเชิญ สร้างรหัสเพื่อเริ่มต้น
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCodes.map((invite) => (
                <div
                  key={invite.code}
                  className="p-3 rounded-xl bg-leaf/5 dark:bg-leaf/10 border border-leaf/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-black text-lg text-sky-dark tracking-wider">
                        {invite.code}
                      </p>
                      <p className="text-xs text-text-light dark:text-gray-400">
                        Created:{" "}
                        {new Date(invite.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => copyCode(invite.code, invite.code)}
                      className="bg-sky-dark text-white font-bold px-3 py-2 rounded-xl text-xs hover:bg-sky-dark/90 transition-colors min-h-[36px]"
                    >
                      {copiedId === invite.code ? "Copied!" : "Code"}
                    </button>
                    <button
                      onClick={() => copyJoinLink(invite.code)}
                      className="bg-leaf text-white font-bold px-3 py-2 rounded-xl text-xs hover:bg-leaf-dark transition-colors min-h-[36px]"
                    >
                      {copiedId === `link-${invite.code}` ? "Copied!" : "Link"}
                    </button>
                    <button
                      onClick={() => revokeCode(invite.code)}
                      className="bg-red-50 dark:bg-red-500/10 text-red-500 font-bold px-3 py-2 rounded-xl text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors min-h-[36px]"
                    >
                      Revoke
                    </button>
                  </div>
                  <p className="text-xs text-text-mid dark:text-gray-400 mt-2 font-mono truncate">
                    {siteUrl}/join/{invite.code}
                  </p>
                </div>
              ))}
              {revokedCodes.map((invite) => (
                <div
                  key={invite.code}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-black text-lg text-text-light tracking-wider line-through">
                      {invite.code}
                    </p>
                    <p className="text-xs text-text-light">Revoked / ถูกเพิกถอน</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Link
            href="/learn"
            className="flex-1 rounded-xl py-3 text-center font-bold text-white bg-leaf hover:bg-leaf-dark transition-colors min-h-[48px]"
          >
            <span className="font-nunito">View Lessons</span>
            <br />
            <span className="font-sarabun text-sm opacity-90">ดูบทเรียน</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 rounded-xl py-3 text-center font-bold text-white bg-sky-dark hover:bg-sky-dark/90 transition-colors min-h-[48px]"
          >
            <span className="font-nunito">Dashboard</span>
            <br />
            <span className="font-sarabun text-sm opacity-90">แดชบอร์ด</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
