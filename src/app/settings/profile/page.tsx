"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ChildProfile {
  id: string;
  display_name: string;
  avatar_emoji: string | null;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");
      setNewEmail(user.email || "");

      // Load own profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
      }

      // Load child profiles
      const { data: childProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_emoji")
        .eq("parent_id", user.id)
        .order("created_at");

      setChildren(childProfiles || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Name cannot be empty. ชื่อไม่สามารถเว้นว่างได้");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);

    if (updateError) {
      setError("Could not update name. ไม่สามารถอัปเดตชื่อได้");
    } else {
      setSuccess("Name updated! อัปเดตชื่อแล้ว");
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleSaveChildName(childId: string) {
    if (!editChildName.trim()) {
      setError("Name cannot be empty. ชื่อไม่สามารถเว้นว่างได้");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: editChildName.trim() })
      .eq("id", childId);

    if (updateError) {
      setError("Could not update child name. ไม่สามารถอัปเดตชื่อได้");
    } else {
      setChildren((prev) =>
        prev.map((c) =>
          c.id === childId ? { ...c, display_name: editChildName.trim() } : c
        )
      );
      setEditingChildId(null);
      setSuccess("Child name updated! อัปเดตชื่อเด็กแล้ว");
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const supabase = createClient();
    const { error: emailError } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    });

    if (emailError) {
      setError(emailError.message);
    } else {
      setEmailPending(true);
      setSuccess(
        "Confirmation email sent to your new address. Please check your inbox and click the link to confirm the change."
      );
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-gray-900 flex items-center justify-center">
        <div className="text-4xl animate-bounce">👤</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900 px-4 py-8 transition-colors">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-text-dark dark:text-gray-100 font-nunito">
            Profile Settings
          </h1>
          <p className="text-text-mid dark:text-gray-400 font-sarabun mt-1">
            ตั้งค่าโปรไฟล์
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-leaf/10 text-leaf-dark text-sm p-3 rounded-xl">
            {success}
          </div>
        )}

        {/* Your Name */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-text-dark dark:text-gray-100 font-nunito mb-4">
            Your Name{" "}
            <span className="font-sarabun text-text-mid dark:text-gray-400 font-normal text-sm">
              ชื่อของคุณ
            </span>
          </h2>
          <form onSubmit={handleSaveName} className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name / ชื่อของคุณ"
              className="w-full text-lg font-bold rounded-xl border-2 border-gray-200 dark:border-gray-600
                         px-4 py-3 text-text-dark dark:text-gray-100 dark:bg-gray-700
                         focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-leaf text-white font-bold px-6 py-3 rounded-xl
                         hover:bg-leaf-dark transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {saving ? "Saving..." : "Save Name / บันทึกชื่อ"}
            </button>
          </form>
        </div>

        {/* Email */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-text-dark dark:text-gray-100 font-nunito mb-4">
            Email{" "}
            <span className="font-sarabun text-text-mid dark:text-gray-400 font-normal text-sm">
              อีเมล
            </span>
          </h2>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600
                         px-4 py-3 text-text-dark dark:text-gray-100 dark:bg-gray-700
                         focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
            />
            {emailPending && (
              <div className="bg-sun/20 text-sun-dark text-sm p-3 rounded-xl">
                <p className="font-bold font-nunito">Change pending / รอการยืนยัน</p>
                <p className="font-sarabun mt-1">
                  A confirmation link has been sent to <strong>{newEmail}</strong>.
                  Your current email (<strong>{email}</strong>) stays active until you confirm.
                </p>
                <p className="font-sarabun mt-1 text-xs">
                  ลิงก์ยืนยันถูกส่งไปยังอีเมลใหม่ อีเมลปัจจุบันยังใช้งานได้จนกว่าจะยืนยัน
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={saving || newEmail === email}
              className="bg-sky-dark text-white font-bold px-6 py-3 rounded-xl
                         hover:bg-sky-dark/90 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {saving ? "Sending..." : "Change Email / เปลี่ยนอีเมล"}
            </button>
          </form>
        </div>

        {/* Child Profiles */}
        {children.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-text-dark dark:text-gray-100 font-nunito mb-4">
              Child Profiles{" "}
              <span className="font-sarabun text-text-mid dark:text-gray-400 font-normal text-sm">
                โปรไฟล์เด็ก
              </span>
            </h2>
            <div className="space-y-3">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700"
                >
                  <span className="text-2xl">{child.avatar_emoji || "🧒"}</span>
                  {editingChildId === child.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editChildName}
                        onChange={(e) => setEditChildName(e.target.value)}
                        className="flex-1 font-bold rounded-lg border-2 border-sky-dark px-2 py-1
                                   text-text-dark dark:text-gray-100 dark:bg-gray-600
                                   focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveChildName(child.id)}
                        disabled={saving}
                        className="text-leaf font-bold text-xs px-2 py-1 rounded-lg hover:bg-leaf/10 min-h-[28px]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingChildId(null)}
                        className="text-text-mid font-bold text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 min-h-[28px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <p className="font-bold text-text-dark dark:text-gray-100 font-nunito">
                        {child.display_name}
                      </p>
                      <button
                        onClick={() => {
                          setEditingChildId(child.id);
                          setEditChildName(child.display_name);
                        }}
                        className="text-text-light hover:text-sky-dark p-1 rounded transition-colors"
                        title="Edit name"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Link
            href="/settings/billing"
            className="flex-1 rounded-xl py-3 text-center font-bold text-white bg-sky-dark hover:bg-sky-dark/90 transition-colors min-h-[48px]"
          >
            <span className="font-nunito">Billing</span>
            <br />
            <span className="font-sarabun text-sm opacity-90">การเรียกเก็บเงิน</span>
          </Link>
          <Link
            href="/learn"
            className="flex-1 rounded-xl py-3 text-center font-bold text-white bg-leaf hover:bg-leaf-dark transition-colors min-h-[48px]"
          >
            <span className="font-nunito">Back to Learn</span>
            <br />
            <span className="font-sarabun text-sm opacity-90">กลับไปเรียน</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
