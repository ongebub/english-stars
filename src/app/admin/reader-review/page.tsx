'use client';

// app/admin/reader-review/page.tsx — Reader book review gallery
// Chris reviews images + text side by side, flags pages for regeneration,
// marks books as approved. Same visual pattern as /punchlist.

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminUpdate } from "@/lib/admin-update";

const supabase = createClient();

type Book = {
  id: string;
  title_en: string;
  reading_level: number;
  sort_order: number;
  status: string;
};

type Page = {
  id: string;
  book_id: string;
  page_number: number;
  text_en: string;
  image_url: string | null;
  audio_url: string | null;
  word_timings: unknown;
  image_prompt: string | null;
  flagged: boolean;
};

type CatalogEntry = {
  storage_path: string;
  description: string | null;
};

export default function ReaderReviewPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [catalog, setCatalog] = useState<Record<string, string>>({});
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: booksData, error: bErr } = await supabase
        .from('reader_books')
        .select('*')
        .order('reading_level')
        .order('sort_order');
      if (bErr) { setError(bErr.message); setLoading(false); return; }
      setBooks(booksData as Book[]);

      const { data: pagesData, error: pErr } = await supabase
        .from('reader_pages')
        .select('*')
        .order('page_number');
      if (pErr) { setError(pErr.message); setLoading(false); return; }
      setPages(pagesData as Page[]);

      // Load catalog descriptions for images that have them
      const { data: catData } = await supabase
        .from('image_catalog')
        .select('storage_path, description')
        .like('storage_path', 'ebook-images/reader-%');
      if (catData) {
        const map: Record<string, string> = {};
        for (const c of catData as CatalogEntry[]) {
          if (c.description) map[c.storage_path] = c.description;
        }
        setCatalog(map);
      }

      setLoading(false);
    }
    load();
  }, []);

  const selectedBook = books.find((b) => b.id === selectedBookId) ?? null;
  const bookPages = useMemo(
    () => pages.filter((p) => p.book_id === selectedBookId).sort((a, b) => a.page_number - b.page_number),
    [pages, selectedBookId]
  );
  const flaggedCount = bookPages.filter((p) => p.flagged).length;

  async function toggleFlag(page: Page) {
    const newVal = !page.flagged;
    setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, flagged: newVal } : p)));
    const { error } = await adminUpdate(
      'reader_pages',
      { column: 'id', value: page.id },
      { flagged: newVal }
    );
    if (error) {
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, flagged: !newVal } : p)));
      alert(`Failed: ${error.message}`);
    }
  }

  async function markApproved() {
    if (!selectedBookId) return;
    if (flaggedCount > 0) {
      alert(`Cannot approve — ${flaggedCount} page(s) still flagged.`);
      return;
    }
    const { error } = await adminUpdate(
      'reader_books',
      { column: 'id', value: selectedBookId },
      { status: 'approved' }
    );
    if (error) { alert(`Failed: ${error.message}`); return; }
    setBooks((prev) => prev.map((b) => (b.id === selectedBookId ? { ...b, status: 'approved' } : b)));
  }

  function catalogDesc(imageUrl: string | null): string | null {
    if (!imageUrl) return null;
    // Extract storage path from public URL
    const match = imageUrl.match(/\/object\/public\/(.+)$/);
    if (!match) return null;
    return catalog[match[1]] ?? null;
  }

  if (loading) return <main className="p-8 text-gray-500">Loading reader books...</main>;
  if (error) return <main className="p-8 text-red-600">Error: {error}</main>;

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-200 text-gray-700',
    images: 'bg-blue-100 text-blue-800',
    audio: 'bg-purple-100 text-purple-800',
    review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reader Review</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {books.length} books · {pages.length} total pages
        </p>
      </header>

      {/* Book selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
        {books.map((book) => {
          const isSelected = book.id === selectedBookId;
          const bookFlagged = pages.filter((p) => p.book_id === book.id && p.flagged).length;
          return (
            <button
              key={book.id}
              onClick={() => setSelectedBookId(isSelected ? null : book.id)}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <span className="text-xs font-mono text-gray-400">L{book.reading_level}</span>
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{book.title_en}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[book.status] ?? 'bg-gray-100'}`}>
                  {book.status}
                </span>
                {bookFlagged > 0 && (
                  <span className="text-xs text-red-600">🚩{bookFlagged}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected book pages */}
      {selectedBook && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedBook.title_en}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {bookPages.length} pages · {flaggedCount} flagged ·
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${statusColors[selectedBook.status] ?? ''}`}>
                  {selectedBook.status}
                </span>
              </p>
            </div>
            {selectedBook.status === 'review' && flaggedCount === 0 && (
              <button
                onClick={markApproved}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 active:scale-95 transition-transform"
              >
                Mark Approved
              </button>
            )}
          </div>

          <div className="space-y-4">
            {bookPages.map((page) => {
              const desc = catalogDesc(page.image_url);
              return (
                <div
                  key={page.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    page.flagged
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    <div className="sm:w-48 flex-shrink-0">
                      {page.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={page.image_url}
                          alt={`Page ${page.page_number}`}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-full h-32 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-mono text-gray-400">p{page.page_number}</span>
                        <button
                          onClick={() => toggleFlag(page)}
                          className={`text-sm px-2 py-1 rounded transition-colors ${
                            page.flagged
                              ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-red-100 hover:text-red-700'
                          }`}
                        >
                          {page.flagged ? '🚩 Flagged' : '🚩 Flag'}
                        </button>
                      </div>
                      <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
                        {page.text_en}
                      </p>
                      {page.image_prompt && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-bold">Prompt:</span> {page.image_prompt}
                        </p>
                      )}
                      {desc && (
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                          <span className="font-bold">Catalog:</span> {desc}
                        </p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        {page.audio_url ? <span className="text-green-600">audio</span> : <span>no audio</span>}
                        {page.word_timings ? <span className="text-green-600">timings</span> : <span>no timings</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
