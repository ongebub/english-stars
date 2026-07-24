"use client";

import { useState } from "react";
import Link from "next/link";

interface Student {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
  created_at: string;
}

interface InviteCode {
  id: string;
  code: string;
  created_at: string;
  revoked: boolean;
}

interface Props {
  seatCount: number;
  periodEnd: string | null;
  students: Student[];
  inviteCodes: InviteCode[];
}

export default function TutorDashboardClient({
  seatCount,
  periodEnd,
  students: initialStudents,
  inviteCodes: initialCodes,
}: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [codes, setCodes] = useState(initialCodes);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const nextBilling = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "N/A";

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
      setCodes((prev) => [data.invite, ...prev]);
    } catch {
      setError("Something went wrong. กรุณาลองใหม่");
    } finally {
      setGenerating(false);
    }
  }

  async function revokeCode(codeId: string) {
    setError("");
    try {
      const res = await fetch("/api/tutor/revoke-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: codeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not revoke code");
        return;
      }
      setCodes((prev) =>
        prev.map((c) => (c.id === codeId ? { ...c, revoked: true } : c))
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
        body: JSON.stringify({ student_id: studentId }),
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

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const activeCodes = codes.filter((c) => !c.revoked);
  const revokedCodes = codes.filter((c) => c.revoked);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-text-dark font-nunito">
            Tutor Dashboard
          </h1>
          <p className="text-text-mid font-sarabun mt-1">
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
              <span className="text-text-mid text-sm">
                Next billing: {nextBilling}
              </span>
            </div>
            <Link
              href="/settings/billing"
              className="bg-sky-dark text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-sky-dark/90 transition-colors min-h-[40px]"
            >
              Manage / จัดการ
            </Link>
          </div>
          <p className="font-sarabun text-text-mid text-sm mt-2">
            แพลนติวเตอร์ &middot; {seatCount} ที่นั่ง &middot; เรียกเก็บถัดไป: {nextBilling}
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
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-black text-leaf">{students.length}</div>
            <p className="text-xs text-text-mid font-nunito">
              Active Students / นักเรียนที่ใช้งาน
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-black text-sky-dark">{seatCount}</div>
            <p className="text-xs text-text-mid font-nunito">
              Total Seats / จำนวนที่นั่งทั้งหมด
            </p>
          </div>
        </div>

        {/* Active students table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-text-dark font-nunito mb-4">
            Active Students{" "}
            <span className="font-sarabun text-text-mid font-normal text-base">
              นักเรียนที่ใช้งาน
            </span>
          </h2>

          {students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">👋</p>
              <p className="text-text-mid font-nunito">No students yet</p>
              <p className="text-text-light font-sarabun text-sm">
                Share an invite code to get started / แชร์รหัสเชิญเพื่อเริ่มต้น
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-3xl">
                    {student.avatar_emoji || "🧒"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-dark font-nunito truncate">
                      {student.display_name}
                    </p>
                    <p className="text-xs text-text-mid">
                      Joined:{" "}
                      {new Date(student.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <span className="mx-1">&middot;</span>
                      Last active: N/A
                    </p>
                  </div>
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="bg-red-50 text-red-500 font-bold px-3 py-2 rounded-xl text-xs hover:bg-red-100 transition-colors min-h-[36px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite codes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-dark font-nunito">
              Invite Codes{" "}
              <span className="font-sarabun text-text-mid font-normal text-base">
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
                  key={invite.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-leaf/5 border border-leaf/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-black text-lg text-sky-dark tracking-wider">
                      {invite.code}
                    </p>
                    <p className="text-xs text-text-light">
                      Created:{" "}
                      {new Date(invite.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => copyCode(invite.code, invite.id)}
                    className="bg-sky-dark text-white font-bold px-3 py-2 rounded-xl text-xs hover:bg-sky-dark/90 transition-colors min-h-[36px]"
                  >
                    {copiedId === invite.id ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => revokeCode(invite.id)}
                    className="bg-red-50 text-red-500 font-bold px-3 py-2 rounded-xl text-xs hover:bg-red-100 transition-colors min-h-[36px]"
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {revokedCodes.map((invite) => (
                <div
                  key={invite.id}
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
