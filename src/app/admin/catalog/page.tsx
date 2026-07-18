'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

const supabase = createClient();

type CatalogImage = {
  id: string;
  storage_path: string;
  description: string | null;
  characters: string | null;
  quality_flag: string | null;
};

const PAGE_SIZE = 30;

const PREFIX_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'flashcard-images/', value: 'flashcard-images/' },
  { label: 'ebook-images/', value: 'ebook-images/' },
  { label: 'picquiz-images/', value: 'picquiz-images/' },
  { label: 'reader-images/', value: 'reader-images/' },
];

function getPublicUrl(storagePath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${storagePath}`;
}

export default function CatalogPage() {
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadImages() {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('image_catalog')
        .select('id, storage_path, description, characters, quality_flag', { count: 'exact' })
        .order('storage_path')
        .range(from, to);

      if (prefix) {
        query = query.like('storage_path', `${prefix}%`);
      }
      if (flaggedOnly) {
        query = query.not('quality_flag', 'is', null);
      }

      const { data, error: err, count } = await query;
      if (err) { setError(err.message); setLoading(false); return; }
      setImages(data as CatalogImage[]);
      setTotalCount(count ?? 0);
      setLoading(false);
    }
    loadImages();
  }, [prefix, flaggedOnly, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (error) return <main className="p-8 text-red-600">Error: {error}</main>;

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-gradient-to-r from-sky-dark to-[#1565C0] text-white px-6 py-6"
        style={{ borderRadius: '0 0 24px 24px' }}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-extrabold">Image Catalog</h1>
          <p className="text-white/80 text-sm mt-1">Search and review all cataloged images</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={prefix}
            onChange={(e) => { setPrefix(e.target.value); setPage(0); }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PREFIX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => { setFlaggedOnly(e.target.checked); setPage(0); }}
              className="rounded"
            />
            Flagged only
          </label>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalCount} images
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading images...</p>
        ) : images.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-gray-50 dark:bg-gray-700">
                    <Image
                      src={getPublicUrl(img.storage_path)}
                      alt={img.description || img.storage_path}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 160px"
                      className="object-contain"
                      unoptimized
                    />
                    {img.quality_flag && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {img.quality_flag}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate" title={img.storage_path}>
                      {img.storage_path.split('/').pop()}
                    </p>
                    {img.description && (
                      <p
                        className={`text-xs text-gray-600 dark:text-gray-400 mt-0.5 cursor-pointer ${
                          expandedId === img.id ? '' : 'line-clamp-2'
                        }`}
                        onClick={() => setExpandedId(expandedId === img.id ? null : img.id)}
                        title="Click to expand"
                      >
                        {img.description}
                      </p>
                    )}
                    {img.characters && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                        {img.characters}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No images found.</p>
        )}
      </div>
    </div>
  );
}
