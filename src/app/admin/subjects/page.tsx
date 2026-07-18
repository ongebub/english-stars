"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Subject } from "@/lib/types";

export default function AdminPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title_en: "", title_th: "", emoji: "", module: 1, is_published: true });

  useEffect(() => {
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSubjects() {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("module")
      .order("sort_order");
    setSubjects(data || []);
    setLoading(false);
  }

  async function handleSave(id: string) {
    await supabase
      .from("subjects")
      .update({
        title_en: form.title_en,
        title_th: form.title_th,
        emoji: form.emoji,
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    setEditing(null);
    loadSubjects();
  }

  function startEdit(subject: Subject) {
    setEditing(subject.id);
    setForm({
      title_en: subject.title_en,
      title_th: subject.title_th,
      emoji: subject.emoji,
      module: subject.module,
      is_published: subject.is_published,
    });
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
      <div className="bg-gradient-to-r from-sky-dark to-[#1565C0] text-white px-6 py-6"
        style={{ borderRadius: "0 0 24px 24px" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-extrabold">⚙️ Admin · จัดการ</h1>
          <p className="text-white/80 text-sm mt-1">Manage subjects and content</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <h2 className="text-lg font-bold text-text-dark mb-4">Subjects · วิชา</h2>

        {[1, 2].map((mod) => (
          <div key={mod} className="mb-8">
            <h3 className="text-sm font-bold text-text-mid mb-3">
              Module {mod} · โมดูล {mod}
            </h3>
            <div className="space-y-2">
              {subjects
                .filter((s) => s.module === mod)
                .map((subject) => (
                  <div key={subject.id} className="bg-white rounded-xl p-4 shadow-sm">
                    {editing === subject.id ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            value={form.emoji}
                            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                            className="w-16 px-2 py-1 border rounded-lg text-center text-xl"
                            placeholder="emoji"
                          />
                          <input
                            value={form.title_en}
                            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                            className="flex-1 px-3 py-1 border rounded-lg text-sm"
                            placeholder="English title"
                          />
                        </div>
                        <input
                          value={form.title_th}
                          onChange={(e) => setForm({ ...form, title_th: e.target.value })}
                          className="w-full px-3 py-1 border rounded-lg text-sm font-sarabun"
                          placeholder="Thai title"
                        />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.is_published}
                              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                            />
                            Published
                          </label>
                          <button
                            onClick={() => handleSave(subject.id)}
                            className="bg-leaf text-white px-4 py-1 rounded-lg text-sm font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="text-text-light text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{subject.emoji}</span>
                          <div>
                            <span className="font-bold text-text-dark text-sm">{subject.title_en}</span>
                            <span className="font-sarabun text-xs text-text-mid ml-2">{subject.title_th}</span>
                          </div>
                          {!subject.is_published && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Draft</span>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(subject)}
                          className="text-sky-dark text-sm font-bold hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
