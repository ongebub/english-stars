'use client';

// app/punchlist/page.tsx — English Allstars shared punchlist
// Route: englishallstars.com/punchlist
//
// Data lives in Supabase table `punchlist_items` (already created + seeded).
// Realtime is enabled on the table, so Matt and Chris see each other's
// checkbox changes live without refreshing.

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type Item = {
  id: string;
  section: string;
  item_number: number;
  title: string;
  description: string;
  matt_checked: boolean;
  chris_checked: boolean;
  done: boolean;
};

type CheckField = 'matt_checked' | 'chris_checked' | 'done';

export default function PunchlistPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('punchlist_items')
        .select('*')
        .order('item_number');
      if (cancelled) return;
      if (error) setError(error.message);
      else setItems((data as Item[]) ?? []);
      setLoading(false);
    }
    load();

    // Live sync — any update from the other person lands here
    const channel = supabase
      .channel('punchlist-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'punchlist_items' },
        (payload) => {
          const updated = payload.new as Item;
          setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  async function toggle(item: Item, field: CheckField) {
    const newValue = !item[field];
    // Optimistic update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, [field]: newValue } : it))
    );
    const { error } = await supabase
      .from('punchlist_items')
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) {
      // Roll back on failure
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, [field]: !newValue } : it))
      );
      alert(`Save failed: ${error.message}`);
    }
  }

  const sections = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      if (!map.has(it.section)) map.set(it.section, []);
      map.get(it.section)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  const doneCount = items.filter((i) => i.done).length;

  if (loading) return <main className="p-8 text-gray-500">Loading punchlist…</main>;
  if (error) return <main className="p-8 text-red-600">Error: {error}</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔨 Punchlist</h1>
        <p className="mt-1 text-gray-500">
          {doneCount} of {items.length} done · updates sync live — no refresh needed
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      {sections.map(([section, sectionItems]) => (
        <section key={section} className="mb-8">
          <h2 className="mb-3 border-b border-gray-200 pb-1 text-lg font-semibold text-gray-700">
            {section}
          </h2>
          <ul className="space-y-2">
            {sectionItems.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border p-3 transition-colors ${
                  item.done ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-300 bg-white'
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className={item.done ? 'line-through text-gray-400' : ''}>
                    <span className="font-medium text-gray-900">
                      <span className="mr-2 text-gray-400">#{item.item_number}</span>
                      {item.title}
                    </span>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 pt-1">
                    <Check
                      label="Matt"
                      checked={item.matt_checked}
                      color="accent-blue-600"
                      onChange={() => toggle(item, 'matt_checked')}
                    />
                    <Check
                      label="Chris"
                      checked={item.chris_checked}
                      color="accent-purple-600"
                      onChange={() => toggle(item, 'chris_checked')}
                    />
                    <Check
                      label="Done"
                      checked={item.done}
                      color="accent-green-600"
                      onChange={() => toggle(item, 'done')}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function Check({
  label,
  checked,
  color,
  onChange,
}: {
  label: string;
  checked: boolean;
  color: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`h-5 w-5 cursor-pointer rounded ${color}`}
      />
      {label}
    </label>
  );
}
