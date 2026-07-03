"use client";

import { useState } from "react";
import Link from "next/link";

interface Student {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
  created_at: string;
}

interface Attempt {
  child_id: string;
  subject_id: string;
  score: number;
  total: number;
  completed_at: string;
}

interface Subject {
  id: string;
  title_en: string;
  slug: string;
}

interface SchoolCode {
  code: string;
  school_name: string;
  max_students: number;
  expires_at: string;
}

interface Props {
  schoolCode: SchoolCode | null;
  students: Student[];
  attempts: Attempt[];
  subjects: Subject[];
  maxStudents: number;
}

export default function SchoolDashboardClient({
  schoolCode,
  students,
  attempts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subjects,
  maxStudents,
}: Props) {
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = schoolCode ? `${siteUrl}/join?code=${schoolCode.code}` : "";

  const filteredStudents = students.filter((s) =>
    s.display_name.toLowerCase().includes(filter.toLowerCase())
  );

  function getStudentStats(studentId: string) {
    const studentAttempts = attempts.filter((a) => a.child_id === studentId);
    const subjectsCompleted = new Set(studentAttempts.map((a) => a.subject_id)).size;
    const totalScore = studentAttempts.reduce((sum, a) => sum + a.score, 0);
    const totalQuestions = studentAttempts.reduce((sum, a) => sum + a.total, 0);
    const lastActive = studentAttempts.length > 0
      ? new Date(Math.max(...studentAttempts.map((a) => new Date(a.completed_at).getTime())))
      : null;
    return { subjectsCompleted, totalScore, totalQuestions, lastActive };
  }

  function copyCode() {
    if (!schoolCode) return;
    navigator.clipboard.writeText(schoolCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function downloadCSV() {
    const header = "Student,Avatar,Subjects Completed,Total Score,Total Questions,Accuracy %,Last Active\n";
    const rows = students.map((s) => {
      const stats = getStudentStats(s.id);
      const accuracy = stats.totalQuestions > 0
        ? Math.round((stats.totalScore / stats.totalQuestions) * 100)
        : 0;
      return `"${s.display_name}",${s.avatar_emoji || "🧒"},${stats.subjectsCompleted},${stats.totalScore},${stats.totalQuestions},${accuracy}%,${stats.lastActive ? stats.lastActive.toLocaleDateString() : "Never"}`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schoolCode?.school_name || "school"}-progress.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!schoolCode) {
    return (
      <div className="max-w-md mx-auto mt-8 text-center">
        <p className="text-text-mid">No school code found. Please contact <a href="mailto:info@englishallstars.com" className="text-sky-dark hover:underline">info@englishallstars.com</a></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-text-dark font-nunito">
          🏫 {schoolCode.school_name}
        </h1>
        <p className="text-text-mid font-sarabun mt-1">
          School Dashboard / แผงควบคุมโรงเรียน
        </p>
      </div>

      {/* Join code card */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="text-center sm:text-left flex-1">
            <p className="text-sm font-bold text-text-mid font-nunito mb-1">
              Class Join Code / รหัสเข้าร่วม
            </p>
            <div className="text-5xl font-black text-sky-dark tracking-[0.2em] font-mono">
              {schoolCode.code}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={copyCode}
              className="bg-sky-dark text-white font-bold px-5 py-2 rounded-xl hover:bg-sky-dark/90 transition-colors text-sm min-h-[44px]"
            >
              {copied ? "Copied! ✓" : "Copy Code"}
            </button>
            <button
              onClick={copyLink}
              className="bg-leaf text-white font-bold px-5 py-2 rounded-xl hover:bg-leaf-dark transition-colors text-sm min-h-[44px]"
            >
              {copiedLink ? "Copied! ✓" : "Share Join Link"}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-light mt-3">
          Students join at: <span className="font-mono text-sky-dark">{joinUrl}</span>
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-sky-dark">{students.length}</div>
          <p className="text-xs text-text-mid font-nunito">Students / นักเรียน</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-leaf">{maxStudents}</div>
          <p className="text-xs text-text-mid font-nunito">Max / สูงสุด</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-coral">{attempts.length}</div>
          <p className="text-xs text-text-mid font-nunito">Quizzes / แบบทดสอบ</p>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-text-dark font-nunito">
            Students <span className="font-sarabun text-text-mid font-normal text-base">นักเรียน</span>
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search / ค้นหา..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 sm:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm
                         focus:border-sky-dark focus:outline-none"
            />
            <button
              onClick={downloadCSV}
              className="bg-gray-100 text-text-dark font-bold px-3 py-2 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
            >
              CSV ↓
            </button>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">👋</p>
            <p className="text-text-mid font-nunito">
              {students.length === 0 ? "No students yet" : "No matches"}
            </p>
            <p className="text-text-light font-sarabun text-sm">
              {students.length === 0 ? "Share the join code with your students" : "ไม่พบผลลัพธ์"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => {
              const stats = getStudentStats(student.id);
              const accuracy = stats.totalQuestions > 0
                ? Math.round((stats.totalScore / stats.totalQuestions) * 100)
                : 0;

              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-3xl">{student.avatar_emoji || "🧒"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-dark font-nunito truncate">
                      {student.display_name}
                    </p>
                    <p className="text-xs text-text-mid">
                      {stats.subjectsCompleted} subjects &middot;{" "}
                      {stats.totalQuestions > 0 ? `${accuracy}% accuracy` : "No quizzes yet"}
                      {stats.lastActive && (
                        <> &middot; Last: {stats.lastActive.toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
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
  );
}
