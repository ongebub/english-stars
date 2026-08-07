"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getInstallState } from "@/components/InstallPrompt";

// ── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionData {
  status: string;
  plan_type: string;
  tier: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  child_count: number;
  max_students: number;
}

interface ChildData {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
  created_at: string;
}

interface StudentData {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
  created_at: string;
  email: string | null;
}

interface Props {
  email: string;
  subscription: SubscriptionData | null;
  isTutor: boolean;
  childProfiles: ChildData[];
  students: StudentData[];
}

// ── Avatar options ───────────────────────────────────────────────────────────
const AVATAR_OPTIONS = [
  "🧒", "👦", "👧", "🧑", "👶", "🐱", "🐶", "🐸", "🦊", "🐼",
  "🦁", "🐯", "🐨", "🐻", "🐰", "🦄", "🐙", "🦋", "🌟", "⭐",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-leaf/20", text: "text-leaf-dark", label: "ใช้งานอยู่" },
    trialing: { bg: "bg-sun/30", text: "text-sun-dark", label: "ทดลองใช้" },
    past_due: { bg: "bg-red-100", text: "text-red-600", label: "ค้างชำระ" },
    canceled: { bg: "bg-gray-100", text: "text-gray-500", label: "ยกเลิกแล้ว" },
    inactive: { bg: "bg-gray-100", text: "text-gray-500", label: "ไม่มีสมาชิก" },
  };
  const s = map[status] || map.inactive;
  return (
    <span className={`inline-block px-3 py-1 rounded-xl text-sm font-bold font-sarabun ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AccountClient({
  email,
  subscription,
  isTutor,
  childProfiles: initialChildren,
  students: initialStudents,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  // ── Shared state ─────────────────────────────────────────────────────────
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3500);
  }

  // ── Password section ──────────────────────────────────────────────────────
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pwNew.length < 8) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (pwNew !== pwConfirm) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    setPwSaving(true);
    // Re-auth first by signing in with current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: pwCurrent,
    });
    if (signInErr) {
      setError("รหัสผ่านปัจจุบันไม่ถูกต้อง");
      setPwSaving(false);
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({
      password: pwNew,
    });
    if (updateErr) {
      setError(updateErr.message);
    } else {
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      showSuccess("เปลี่ยนรหัสผ่านแล้ว");
    }
    setPwSaving(false);
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  }

  // ── Children section ──────────────────────────────────────────────────────
  const [children, setChildren] = useState(initialChildren);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState("");
  const [editChildAvatar, setEditChildAvatar] = useState("");
  const [childSaving, setChildSaving] = useState(false);

  // Remove child
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [removeConfirmText, setRemoveConfirmText] = useState("");

  // Add child form
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAvatar, setNewChildAvatar] = useState("🧒");
  const [addingChild, setAddingChild] = useState(false);

  async function handleSaveChildName(childId: string) {
    if (!editChildName.trim()) {
      setError("กรุณากรอกชื่อ");
      return;
    }
    setChildSaving(true);
    setError("");
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        display_name: editChildName.trim(),
        avatar_emoji: editChildAvatar || "🧒",
      })
      .eq("id", childId);
    if (updateErr) {
      setError("ไม่สามารถอัปเดตข้อมูลได้");
    } else {
      setChildren((prev) =>
        prev.map((c) =>
          c.id === childId
            ? {
                ...c,
                display_name: editChildName.trim(),
                avatar_emoji: editChildAvatar || c.avatar_emoji,
              }
            : c
        )
      );
      setEditingChildId(null);
      showSuccess("อัปเดตข้อมูลเรียบร้อย");
    }
    setChildSaving(false);
  }

  async function handleRemoveChild(child: ChildData) {
    if (removeConfirmText !== child.display_name) {
      setError(`กรุณาพิมพ์ชื่อ "${child.display_name}" เพื่อยืนยัน`);
      return;
    }
    setError("");
    // Soft-delete: update role to mark as removed
    // The profiles table doesn't have deleted_at; use a workaround:
    // set display_name with a prefix to mark deletion, and remove parent_id
    const { error: delErr } = await supabase
      .from("profiles")
      .update({
        parent_id: null,
        display_name: `[ลบแล้ว] ${child.display_name}`,
      })
      .eq("id", child.id);
    if (delErr) {
      setError("ไม่สามารถลบโปรไฟล์ได้");
    } else {
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      setRemoveConfirmId(null);
      setRemoveConfirmText("");
      showSuccess("ลบโปรไฟล์เรียบร้อย");
    }
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!newChildName.trim()) {
      setError("กรุณากรอกชื่อ");
      return;
    }
    setAddingChild(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: newChildName.trim(),
        role: "child",
        avatar_emoji: newChildAvatar,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "ไม่สามารถเพิ่มโปรไฟล์เด็กได้");
    } else {
      setChildren((prev) => [
        ...prev,
        {
          id: data.profile?.id || String(Date.now()),
          display_name: newChildName.trim(),
          avatar_emoji: newChildAvatar,
          created_at: new Date().toISOString(),
        },
      ]);
      setNewChildName("");
      setNewChildAvatar("🧒");
      setAddChildOpen(false);
      showSuccess("เพิ่มโปรไฟล์เด็กแล้ว");
    }
    setAddingChild(false);
  }

  // ── Students section (tutor) ──────────────────────────────────────────────
  const [students, setStudents] = useState(initialStudents);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [removeStudentConfirmId, setRemoveStudentConfirmId] = useState<string | null>(null);
  const [removeStudentConfirmText, setRemoveStudentConfirmText] = useState("");

  async function handleRenameStudent(studentId: string) {
    if (!editStudentName.trim()) {
      setError("กรุณากรอกชื่อ");
      return;
    }
    setStudentSaving(true);
    setError("");
    const res = await fetch("/api/tutor/update-student-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, display_name: editStudentName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "ไม่สามารถแก้ไขชื่อได้");
    } else {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, display_name: editStudentName.trim() } : s
        )
      );
      setEditingStudentId(null);
      showSuccess("อัปเดตชื่อแล้ว");
    }
    setStudentSaving(false);
  }

  async function handleRemoveStudent(student: StudentData) {
    if (removeStudentConfirmText !== student.display_name) {
      setError(`กรุณาพิมพ์ชื่อ "${student.display_name}" เพื่อยืนยัน`);
      return;
    }
    setError("");
    const res = await fetch("/api/tutor/remove-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_user_id: student.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "ไม่สามารถลบนักเรียนได้");
    } else {
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setRemoveStudentConfirmId(null);
      setRemoveStudentConfirmText("");
      showSuccess("ลบนักเรียนแล้ว");
    }
  }

  // ── Stripe portal ─────────────────────────────────────────────────────────
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleManageBilling() {
    setPortalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("ไม่สามารถเปิดหน้าจัดการการชำระเงินได้");
        setPortalLoading(false);
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setPortalLoading(false);
    }
  }

  // ── Install app section ───────────────────────────────────────────────────
  const [installState, setInstallState] = useState<
    "available" | "ios" | "standalone" | "unavailable" | null
  >(null);

  useEffect(() => {
    setInstallState(getInstallState());
  }, []);

  async function handleInstall() {
    const w = window as { __installPrompt?: { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } };
    if (!w.__installPrompt) return;
    await w.__installPrompt.prompt();
    const { outcome } = await w.__installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallState("standalone");
    }
  }

  // ── Subscription display helpers ──────────────────────────────────────────
  const sub = subscription;
  const trialDays = daysUntil(sub?.trial_end || null);
  const trialEndDisplay = fmtDate(sub?.trial_end || null);
  const renewDisplay = fmtDate(sub?.current_period_end || null);
  const isTialing = sub?.status === "trialing";
  const isPastDue = sub?.status === "past_due";
  const isActive = sub?.status === "active";
  const isCanceled = sub?.status === "canceled" || sub?.status === "inactive";

  const planLabel = isTutor
    ? `ติวเตอร์ (${sub?.max_students || 0} ที่นั่ง)`
    : sub?.plan_type === "school"
    ? "โรงเรียน"
    : "ครอบครัว";

  const seatCount = sub?.max_students || 0;

  // Monthly price estimate
  const monthlyPrice = isTutor ? (seatCount || 1) * 250 : 750;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900 px-4 py-8 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-3xl font-black text-text-dark dark:text-gray-100 font-nunito">
            บัญชีของฉัน
          </h1>
          <p className="font-sarabun text-text-mid dark:text-gray-400 mt-1">
            จัดการบัญชีและการสมัครสมาชิก
          </p>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl font-sarabun">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-leaf/10 text-leaf-dark text-sm p-4 rounded-xl font-sarabun">
            {success}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1: Subscription
        ══════════════════════════════════════════════════════════════════ */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-sky-dark px-6 py-4">
            <h2 className="text-lg font-bold text-white font-nunito">
              💳 การสมัครสมาชิก
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {!sub || isCanceled ? (
              <div className="text-center py-4">
                <p className="font-sarabun text-text-mid dark:text-gray-400 mb-4">
                  ยังไม่มีสมาชิกที่ใช้งานอยู่
                </p>
                <Link
                  href="/subscribe"
                  className="inline-block bg-leaf text-white font-bold px-6 py-3 rounded-xl hover:bg-leaf-dark transition-colors font-nunito"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            ) : (
              <>
                {/* Trial banner — prominent */}
                {isTialing && (
                  <div className="bg-sun/30 border-2 border-sun rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">⏳</span>
                      <div>
                        <p className="font-nunito font-black text-sun-dark text-lg">
                          ทดลองใช้ฟรี — เหลืออีก {trialDays} วัน
                        </p>
                        <p className="font-sarabun text-text-mid text-sm">
                          สิ้นสุดทดลองวันที่: {trialEndDisplay}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 mt-2">
                      <p className="font-sarabun text-text-dark text-sm">
                        หลังจากหมดทดลองใช้ จะมีการเรียกเก็บเงิน{" "}
                        <span className="font-black text-sky-dark text-base">
                          ฿{monthlyPrice.toLocaleString()}
                        </span>{" "}
                        ต่อเดือน
                        {trialEndDisplay && ` ในวันที่ ${trialEndDisplay}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Past due banner */}
                {isPastDue && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <p className="font-nunito font-bold text-red-600">
                      การชำระเงินล้มเหลว
                    </p>
                    <p className="font-sarabun text-red-500 text-sm mt-1">
                      กรุณาอัปเดตบัตรเพื่อรักษาการเข้าถึงบัญชี
                    </p>
                  </div>
                )}

                {/* Plan info row */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-sarabun text-text-mid dark:text-gray-400 text-sm">แผน</span>
                  <span className="font-nunito font-bold text-text-dark dark:text-gray-100 text-sm">
                    {planLabel}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-sarabun text-text-mid dark:text-gray-400 text-sm">สถานะ</span>
                  <StatusBadge status={sub.status} />
                </div>

                {/* Price */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-sarabun text-text-mid dark:text-gray-400 text-sm">ราคาต่อเดือน</span>
                  <span className="font-nunito font-black text-sky-dark text-lg">
                    ฿{monthlyPrice.toLocaleString()}
                  </span>
                </div>

                {/* Next renewal (active) */}
                {isActive && renewDisplay && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-sarabun text-text-mid dark:text-gray-400 text-sm">ต่ออายุครั้งถัดไป</span>
                    <span className="font-sarabun text-text-dark dark:text-gray-100 text-sm">
                      {renewDisplay}
                    </span>
                  </div>
                )}

                {/* Manage billing */}
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="w-full bg-sky-dark text-white font-bold text-base py-4 rounded-xl hover:bg-sky-dark/90 transition-colors disabled:opacity-60 font-nunito mt-2"
                >
                  {portalLoading ? "กำลังโหลด..." : "จัดการการชำระเงิน"}
                </button>
              </>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2: Children (family accounts)
        ══════════════════════════════════════════════════════════════════ */}
        {!isTutor && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-leaf px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white font-nunito">
                👨‍👩‍👧 โปรไฟล์เด็ก
              </h2>
              <button
                onClick={() => {
                  setAddChildOpen((v) => !v);
                  setError("");
                }}
                className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl text-sm transition-colors font-nunito"
              >
                + เพิ่มเด็ก
              </button>
            </div>

            <div className="p-6 space-y-3">
              {/* Add child form */}
              {addChildOpen && (
                <form
                  onSubmit={handleAddChild}
                  className="bg-leaf/5 border-2 border-leaf/20 rounded-xl p-4 space-y-3 mb-2"
                >
                  <p className="font-nunito font-bold text-text-dark dark:text-gray-100 text-sm">
                    เพิ่มโปรไฟล์เด็กใหม่
                  </p>

                  {/* Avatar picker */}
                  <div>
                    <p className="font-sarabun text-text-mid dark:text-gray-400 text-xs mb-2">
                      เลือกอวตาร
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setNewChildAvatar(emoji)}
                          className={`text-xl w-9 h-9 rounded-xl transition-colors ${
                            newChildAvatar === emoji
                              ? "bg-leaf/30 ring-2 ring-leaf"
                              : "bg-gray-100 dark:bg-gray-700 hover:bg-leaf/10"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="ชื่อเด็ก"
                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600
                               px-4 py-3 text-text-dark dark:text-gray-100 dark:bg-gray-700
                               focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/30
                               font-sarabun"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={addingChild}
                      className="flex-1 bg-leaf text-white font-bold py-3 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-60 font-nunito min-h-[44px]"
                    >
                      {addingChild ? "กำลังเพิ่ม..." : "เพิ่มโปรไฟล์"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddChildOpen(false);
                        setNewChildName("");
                        setError("");
                      }}
                      className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-text-mid dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-nunito"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              )}

              {children.length === 0 && !addChildOpen && (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">👶</p>
                  <p className="font-sarabun text-text-mid dark:text-gray-400 text-sm">
                    ยังไม่มีโปรไฟล์เด็ก
                  </p>
                </div>
              )}

              {children.map((child) => (
                <div key={child.id}>
                  {/* Remove confirmation */}
                  {removeConfirmId === child.id ? (
                    <div className="bg-red-50 dark:bg-red-500/10 border-2 border-red-200 rounded-xl p-4 space-y-3">
                      <p className="font-sarabun text-red-600 text-sm font-bold">
                        ยืนยันการลบโปรไฟล์ {child.avatar_emoji || "🧒"} {child.display_name}
                      </p>
                      <p className="font-sarabun text-red-500 text-xs">
                        พิมพ์ชื่อ <strong>{child.display_name}</strong> เพื่อยืนยัน
                      </p>
                      <input
                        type="text"
                        value={removeConfirmText}
                        onChange={(e) => setRemoveConfirmText(e.target.value)}
                        placeholder="พิมพ์ชื่อเพื่อยืนยัน"
                        className="w-full rounded-xl border-2 border-red-200 px-4 py-2
                                   text-text-dark dark:text-gray-100 dark:bg-gray-700
                                   focus:outline-none focus:ring-2 focus:ring-red-300 font-sarabun text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRemoveChild(child)}
                          className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl hover:bg-red-600 transition-colors font-nunito text-sm"
                        >
                          ลบโปรไฟล์
                        </button>
                        <button
                          onClick={() => {
                            setRemoveConfirmId(null);
                            setRemoveConfirmText("");
                            setError("");
                          }}
                          className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-text-mid font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-nunito text-sm"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : editingChildId === child.id ? (
                    /* Edit form */
                    <div className="bg-sky-dark/5 border-2 border-sky-dark/20 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="font-sarabun text-text-mid dark:text-gray-400 text-xs mb-2">
                          เลือกอวตาร
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_OPTIONS.map((emoji) => (
                            <button
                              type="button"
                              key={emoji}
                              onClick={() => setEditChildAvatar(emoji)}
                              className={`text-xl w-9 h-9 rounded-xl transition-colors ${
                                editChildAvatar === emoji
                                  ? "bg-sky-dark/30 ring-2 ring-sky-dark"
                                  : "bg-gray-100 dark:bg-gray-700 hover:bg-sky-dark/10"
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={editChildName}
                        onChange={(e) => setEditChildName(e.target.value)}
                        className="w-full rounded-xl border-2 border-sky-dark px-4 py-2
                                   text-text-dark dark:text-gray-100 dark:bg-gray-700
                                   focus:outline-none focus:ring-2 focus:ring-sky-dark/30 font-sarabun"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveChildName(child.id)}
                          disabled={childSaving}
                          className="flex-1 bg-leaf text-white font-bold py-2 rounded-xl hover:bg-leaf-dark transition-colors disabled:opacity-60 font-nunito text-sm"
                        >
                          {childSaving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                        <button
                          onClick={() => setEditingChildId(null)}
                          className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-text-mid font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-nunito text-sm"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal row */
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <span className="text-3xl flex-shrink-0">
                        {child.avatar_emoji || "🧒"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-dark dark:text-gray-100 font-nunito truncate">
                          {child.display_name}
                        </p>
                        <p className="text-xs text-text-light dark:text-gray-500 font-sarabun">
                          เข้าร่วม{" "}
                          {new Date(child.created_at).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingChildId(child.id);
                          setEditChildName(child.display_name);
                          setEditChildAvatar(child.avatar_emoji || "🧒");
                        }}
                        className="text-text-light hover:text-sky-dark p-2 rounded-xl transition-colors"
                        title="แก้ไข"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setRemoveConfirmId(child.id);
                          setRemoveConfirmText("");
                          setError("");
                        }}
                        className="text-red-400 hover:text-red-600 p-2 rounded-xl transition-colors"
                        title="ลบ"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3: Students (tutor accounts)
        ══════════════════════════════════════════════════════════════════ */}
        {isTutor && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-sky-dark px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white font-nunito">
                🎓 นักเรียน
              </h2>
              <span className="font-sarabun text-white/80 text-sm">
                {students.length} / {seatCount} ที่นั่ง
              </span>
            </div>

            <div className="p-6 space-y-3">
              {/* Seat usage bar */}
              <div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-dark rounded-full transition-all"
                    style={{
                      width: `${seatCount > 0 ? Math.min(100, (students.length / seatCount) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="font-sarabun text-text-light dark:text-gray-500 text-xs mt-1">
                  ใช้ {students.length} จาก {seatCount} ที่นั่ง
                </p>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">👋</p>
                  <p className="font-sarabun text-text-mid dark:text-gray-400 text-sm">
                    ยังไม่มีนักเรียน
                  </p>
                </div>
              ) : (
                students.map((student) => (
                  <div key={student.id}>
                    {removeStudentConfirmId === student.id ? (
                      <div className="bg-red-50 dark:bg-red-500/10 border-2 border-red-200 rounded-xl p-4 space-y-3">
                        <p className="font-sarabun text-red-600 text-sm font-bold">
                          ยืนยันการลบ {student.avatar_emoji || "🧒"} {student.display_name}
                        </p>
                        <p className="font-sarabun text-red-500 text-xs">
                          พิมพ์ชื่อ <strong>{student.display_name}</strong> เพื่อยืนยัน
                        </p>
                        <input
                          type="text"
                          value={removeStudentConfirmText}
                          onChange={(e) => setRemoveStudentConfirmText(e.target.value)}
                          placeholder="พิมพ์ชื่อเพื่อยืนยัน"
                          className="w-full rounded-xl border-2 border-red-200 px-4 py-2
                                     text-text-dark dark:text-gray-100 dark:bg-gray-700
                                     focus:outline-none focus:ring-2 focus:ring-red-300 font-sarabun text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRemoveStudent(student)}
                            className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl hover:bg-red-600 transition-colors font-nunito text-sm"
                          >
                            ลบนักเรียน
                          </button>
                          <button
                            onClick={() => {
                              setRemoveStudentConfirmId(null);
                              setRemoveStudentConfirmText("");
                              setError("");
                            }}
                            className="px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-text-mid font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-nunito text-sm"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <span className="text-3xl flex-shrink-0">
                          {student.avatar_emoji || "🧒"}
                        </span>
                        <div className="flex-1 min-w-0">
                          {editingStudentId === student.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleRenameStudent(student.id);
                              }}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="text"
                                value={editStudentName}
                                onChange={(e) => setEditStudentName(e.target.value)}
                                className="font-bold text-text-dark dark:text-gray-100 font-nunito text-sm
                                           border-2 border-sky-dark rounded-lg px-2 py-1 flex-1
                                           focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                                           dark:bg-gray-700"
                                autoFocus
                              />
                              <button
                                type="submit"
                                disabled={studentSaving}
                                className="text-leaf font-bold text-xs px-2 py-1 rounded-lg hover:bg-leaf/10 min-h-[28px]"
                              >
                                บันทึก
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudentId(null)}
                                className="text-text-mid font-bold text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 min-h-[28px]"
                              >
                                ยกเลิก
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-1">
                              <p className="font-bold text-text-dark dark:text-gray-100 font-nunito truncate">
                                {student.display_name}
                              </p>
                              <button
                                onClick={() => {
                                  setEditingStudentId(student.id);
                                  setEditStudentName(student.display_name);
                                }}
                                className="text-text-light hover:text-sky-dark p-1 rounded transition-colors flex-shrink-0"
                                title="แก้ไขชื่อ"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          )}
                          {student.email && (
                            <p className="text-xs text-text-mid dark:text-gray-400 font-sarabun truncate">
                              {student.email}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setRemoveStudentConfirmId(student.id);
                            setRemoveStudentConfirmText("");
                            setError("");
                          }}
                          className="text-red-400 hover:text-red-600 p-2 rounded-xl transition-colors"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              <Link
                href="/tutor/dashboard"
                className="block w-full text-center bg-sky-dark/10 text-sky-dark font-bold py-3 rounded-xl hover:bg-sky-dark/20 transition-colors font-nunito text-sm mt-2"
              >
                ดูแดชบอร์ดติวเตอร์เต็มรูปแบบ →
              </Link>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4: Install App
        ══════════════════════════════════════════════════════════════════ */}
        {installState !== "standalone" && installState !== null && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-purple-dark px-6 py-4">
              <h2 className="text-lg font-bold text-white font-nunito">
                📲 ติดตั้งแอป
              </h2>
            </div>
            <div className="p-6">
              {installState === "available" && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-sarabun text-text-dark dark:text-gray-100 text-sm">
                      ติดตั้ง English Allstars บนหน้าจอโฮมของคุณ เปิดใช้ได้เร็วขึ้น
                    </p>
                  </div>
                  <button
                    onClick={handleInstall}
                    className="bg-sky-dark text-white font-bold px-5 py-3 rounded-xl hover:bg-sky-dark/90 transition-colors font-nunito text-sm flex-shrink-0 min-h-[44px]"
                  >
                    ติดตั้ง
                  </button>
                </div>
              )}
              {installState === "ios" && (
                <div className="space-y-2">
                  <p className="font-sarabun text-text-dark dark:text-gray-100 text-sm">
                    ติดตั้งบน iPhone / iPad:
                  </p>
                  <ol className="font-sarabun text-text-mid dark:text-gray-400 text-sm space-y-1 list-decimal list-inside">
                    <li>แตะปุ่ม Share (กล่องมีลูกศรชี้ขึ้น) ในแถบล่าง Safari</li>
                    <li>เลือก <strong>&quot;เพิ่มไปยังหน้าจอโฮม&quot;</strong></li>
                    <li>กด <strong>เพิ่ม</strong></li>
                  </ol>
                </div>
              )}
              {installState === "unavailable" && (
                <p className="font-sarabun text-text-mid dark:text-gray-400 text-sm">
                  เปิดในเบราว์เซอร์ Chrome หรือ Safari เพื่อติดตั้งแอป
                </p>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5: Account Basics
        ══════════════════════════════════════════════════════════════════ */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-text-dark dark:bg-gray-700 px-6 py-4">
            <h2 className="text-lg font-bold text-white font-nunito">
              ⚙️ ข้อมูลบัญชี
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Email */}
            <div>
              <p className="font-sarabun text-text-mid dark:text-gray-400 text-xs mb-1">
                อีเมล
              </p>
              <p className="font-nunito font-bold text-text-dark dark:text-gray-100">
                {email}
              </p>
              <Link
                href="/settings/profile"
                className="text-sky-dark text-xs font-sarabun hover:underline"
              >
                เปลี่ยนอีเมล →
              </Link>
            </div>

            {/* Change password */}
            <div>
              <h3 className="font-nunito font-bold text-text-dark dark:text-gray-100 mb-3">
                เปลี่ยนรหัสผ่าน
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="รหัสผ่านปัจจุบัน"
                  autoComplete="current-password"
                  className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600
                             px-4 py-3 text-text-dark dark:text-gray-100 dark:bg-gray-700
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                             font-sarabun"
                />
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                  autoComplete="new-password"
                  className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600
                             px-4 py-3 text-text-dark dark:text-gray-100 dark:bg-gray-700
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                             font-sarabun"
                />
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  autoComplete="new-password"
                  className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600
                             px-4 py-3 text-text-dark dark:text-gray-100 dark:bg-gray-700
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30
                             font-sarabun"
                />
                <button
                  type="submit"
                  disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                  className="bg-sky-dark text-white font-bold px-6 py-3 rounded-xl
                             hover:bg-sky-dark/90 transition-colors disabled:opacity-50 font-nunito min-h-[44px]"
                >
                  {pwSaving ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                </button>
              </form>
            </div>

            {/* Language preference placeholder */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <p className="font-sarabun text-text-mid dark:text-gray-400 text-sm">
                🌐 ภาษา — ไทย (เร็วๆ นี้จะเพิ่มตัวเลือก)
              </p>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400
                         font-bold text-base py-4 rounded-xl
                         hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-60
                         font-nunito border-2 border-red-200 dark:border-red-500/30"
            >
              {signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
            </button>
          </div>
        </section>

        {/* ── Nav links ── */}
        <div className="flex gap-3 pb-4">
          <Link
            href="/learn"
            className="flex-1 rounded-xl py-3 text-center font-bold text-white bg-leaf hover:bg-leaf-dark transition-colors min-h-[48px] flex items-center justify-center font-nunito"
          >
            กลับไปเรียน
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 rounded-xl py-3 text-center font-bold text-white bg-sky-dark hover:bg-sky-dark/90 transition-colors min-h-[48px] flex items-center justify-center font-nunito"
          >
            แดชบอร์ด
          </Link>
        </div>
      </div>
    </div>
  );
}
