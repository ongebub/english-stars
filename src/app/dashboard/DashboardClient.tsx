'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Profile } from '@/lib/types';

const AVATAR_EMOJIS = ['🧒', '👧', '👦', '🧒🏻', '👧🏽', '👦🏾', '🦸', '🧑‍🎓', '🐻', '🐰', '🦊', '🐼'];

interface DashboardClientProps {
  userId: string;
  profile: Profile | null;
  childProfiles: Profile[];
}

export default function DashboardClient({
  userId,
  profile,
  childProfiles: initialChildren,
}: DashboardClientProps) {
  const router = useRouter();
  const [children, setChildren] = useState<Profile[]>(initialChildren);

  // Create-profile state (shown when no profile exists)
  const [displayName, setDisplayName] = useState('');
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Add-child state
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [childEmoji, setChildEmoji] = useState('🧒');
  const [addingChild, setAddingChild] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatingProfile(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          role: 'parent',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Could not create profile. กรุณาลองใหม่');
        return;
      }

      router.refresh();
    } catch {
      setError('Something went wrong. กรุณาลองใหม่');
    } finally {
      setCreatingProfile(false);
    }
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddingChild(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: childName,
          role: 'child',
          parent_id: userId,
          avatar_emoji: childEmoji,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Could not add child. กรุณาลองใหม่');
        return;
      }

      const { profile: newChild } = await res.json();
      setChildren((prev) => [...prev, newChild]);
      setChildName('');
      setChildEmoji('🧒');
      setShowAddChild(false);
    } catch {
      setError('Something went wrong. กรุณาลองใหม่');
    } finally {
      setAddingChild(false);
    }
  }

  // ─── No profile yet: show create-profile form ───
  if (!profile) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-text-dark font-nunito mb-1">
            Welcome! / ยินดีต้อนรับ!
          </h1>
          <p className="text-text-mid font-sarabun mb-6">
            Let&apos;s set up your parent profile first.
            <br />
            มาตั้งค่าโปรไฟล์ผู้ปกครองกันก่อน
          </p>

          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-bold text-text-dark mb-1"
              >
                <span className="font-nunito">Your Name</span>{' '}
                <span className="font-sarabun text-text-mid">ชื่อของคุณ</span>
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Mom / แม่"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 min-h-[48px] text-text-dark
                           focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
              />
            </div>

            {error && (
              <div className="bg-coral/20 border-2 border-coral rounded-xl p-3 text-sm text-text-dark">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={creatingProfile}
              className="w-full rounded-xl py-4 min-h-[48px] font-bold text-white text-lg
                         bg-gradient-to-r from-sky-dark to-leaf hover:from-sky-dark/90 hover:to-leaf/90
                         shadow-md disabled:opacity-50 transition-all"
            >
              {creatingProfile ? 'Creating... / กำลังสร้าง...' : 'Create Profile / สร้างโปรไฟล์'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Main dashboard ───
  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-text-dark font-nunito">
          Hello, {profile.display_name}! 👋
        </h1>
        <p className="text-text-mid font-sarabun text-lg mt-1">
          สวัสดี {profile.display_name}! ยินดีต้อนรับสู่ English Stars
        </p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-4">
        <Link
          href="/learn"
          className="flex-1 min-w-[140px] rounded-xl bg-gradient-to-br from-leaf to-leaf-dark p-5 min-h-[48px]
                     text-white font-bold text-center shadow-md hover:shadow-lg transition-shadow"
        >
          <span className="text-2xl block mb-1">📚</span>
          <span className="font-nunito">Start Learning</span>
          <br />
          <span className="font-sarabun text-sm opacity-90">เริ่มเรียนรู้</span>
        </Link>
        <Link
          href="/gradebook"
          className="flex-1 min-w-[140px] rounded-xl bg-gradient-to-br from-coral to-coral-dark p-5 min-h-[48px]
                     text-white font-bold text-center shadow-md hover:shadow-lg transition-shadow"
        >
          <span className="text-2xl block mb-1">📊</span>
          <span className="font-nunito">Gradebook</span>
          <br />
          <span className="font-sarabun text-sm opacity-90">สมุดเกรด</span>
        </Link>
      </div>

      {/* Children section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-dark font-nunito">
            Children <span className="font-sarabun text-text-mid font-normal text-base">บุตรหลาน</span>
          </h2>
          <button
            onClick={() => setShowAddChild(!showAddChild)}
            className="rounded-xl px-4 py-2 min-h-[48px] font-bold text-white
                       bg-sky-dark hover:bg-sky-dark/90 shadow-md transition-all"
          >
            <span className="font-nunito">{showAddChild ? 'Cancel' : '+ Add Child'}</span>
            <br />
            <span className="font-sarabun text-sm">{showAddChild ? 'ยกเลิก' : '+ เพิ่มบุตร'}</span>
          </button>
        </div>

        {/* Add child form */}
        {showAddChild && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-sun">
            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label
                  htmlFor="childName"
                  className="block text-sm font-bold text-text-dark mb-1"
                >
                  <span className="font-nunito">Child&apos;s Name</span>{' '}
                  <span className="font-sarabun text-text-mid">ชื่อเด็ก</span>
                </label>
                <input
                  id="childName"
                  type="text"
                  required
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Nong Ploy / น้องพลอย"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 min-h-[48px] text-text-dark
                             focus:border-sky-dark focus:outline-none focus:ring-2 focus:ring-sky-dark/30"
                />
              </div>

              {/* Emoji picker */}
              <div>
                <p className="text-sm font-bold text-text-dark mb-2">
                  <span className="font-nunito">Choose Avatar</span>{' '}
                  <span className="font-sarabun text-text-mid">เลือกอวตาร</span>
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setChildEmoji(emoji)}
                      className={`text-3xl p-2 rounded-xl min-h-[48px] min-w-[48px] transition-all
                        ${
                          childEmoji === emoji
                            ? 'bg-sun border-2 border-sun-dark scale-110 shadow-md'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={addingChild}
                className="w-full rounded-xl py-3 min-h-[48px] font-bold text-white
                           bg-gradient-to-r from-sky-dark to-leaf hover:from-sky-dark/90 hover:to-leaf/90
                           shadow-md disabled:opacity-50 transition-all"
              >
                {addingChild ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Adding... / กำลังเพิ่ม...
                  </span>
                ) : 'Add Child / เพิ่มบุตร'}
              </button>
            </form>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-coral/20 border-2 border-coral rounded-xl p-4 text-sm text-text-dark mb-4">
            {error}
          </div>
        )}

        {/* Children cards */}
        {children.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-4xl mb-3">👶</p>
            <p className="text-text-dark font-nunito font-bold">No children added yet</p>
            <p className="text-text-mid font-sarabun">ยังไม่มีบุตรหลาน กดปุ่มด้านบนเพื่อเพิ่ม</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center
                           hover:shadow-lg transition-shadow border-2 border-transparent hover:border-sky-dark/20"
              >
                <span className="text-5xl mb-3">{child.avatar_emoji || '🧒'}</span>
                <h3 className="text-lg font-bold text-text-dark font-nunito">
                  {child.display_name}
                </h3>
                <div className="flex gap-2 mt-4 w-full">
                  <Link
                    href="/learn"
                    className="flex-1 rounded-xl py-2 min-h-[48px] text-center font-bold text-white
                               bg-leaf hover:bg-leaf-dark transition-colors text-sm flex flex-col justify-center"
                  >
                    <span className="font-nunito">Learn</span>
                    <span className="font-sarabun text-xs opacity-90">เรียนรู้</span>
                  </Link>
                  <Link
                    href="/gradebook"
                    className="flex-1 rounded-xl py-2 min-h-[48px] text-center font-bold text-white
                               bg-coral hover:bg-coral-dark transition-colors text-sm flex flex-col justify-center"
                  >
                    <span className="font-nunito">Grades</span>
                    <span className="font-sarabun text-xs opacity-90">เกรด</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
