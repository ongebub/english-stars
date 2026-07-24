// regen-interview-teacher-julie.mjs — Rehost regenerated Interview Practice pages 3-11 (Teacher Julie redesign)
// Run: node --env-file=.env.local "ebook scripts/regen-interview-teacher-julie.mjs"
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing credentials'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const SUBJECT_ID = 'a8dd9dbc-4c1b-4e0f-8633-bd333e95d524';

const PAGES = [
  { page: 3, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224321_4721488c-d698-4541-8a31-1370ff863949.png',
    desc: 'Thawan sitting in a chair across from Teacher Julie at a desk in a schoolroom. Teacher Julie greeting warmly. Bookshelf and warm morning light in background. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 4, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224323_b5c4b992-f876-4838-ab35-ed174c9107fa.png',
    desc: 'Thawan speaking clearly and confidently in a chair. Teacher Julie listening attentively, nodding, from across desk. Schoolroom with bookshelf. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 5, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224326_6a458362-7f97-4f70-b35c-c0fd18e06af2.png',
    desc: 'Thawan speaking with growing confidence, one hand gesturing. Teacher Julie asking questions from across the desk. Schoolroom setting. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 6, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224334_176130a2-5784-4a2d-a773-2d15fddf2f3c.png',
    desc: 'Thawan smiling proudly as he answers. Teacher Julie nodding approvingly from across the desk. Schoolroom with bookshelf and warm light. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 7, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224338_b010a29b-c9d9-4ef6-ac67-0a63e89aa83b.png',
    desc: 'Thawan counting on his fingers talking about siblings. Teacher Julie smiling and listening from across the desk. Schoolroom setting. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 8, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224341_7a5162a0-9075-45c7-bdfc-e21fb210c85f.png',
    desc: 'Thawan pointing at his teal shirt with a smile. Teacher Julie writing notes at the desk. Schoolroom with bookshelf. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 9, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224349_969233ec-f9f5-48f9-897b-60db27727ff9.png',
    desc: 'Thawan miming kicking a football excitedly. Teacher Julie laughing warmly from across the desk. Schoolroom setting. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 10, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224352_026e37f3-b273-4f16-8b31-5c3c759b4612.png',
    desc: 'Teacher Julie holding up a white card with a bold black circle. Thawan pointing at the card confidently. Schoolroom with desk, chairs, bookshelf. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
  { page: 11, cdnUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_3EAtttTjAd2vWXZnHrUcBbRTaZ3/hf_20260724_224355_1b7ca5bd-9d9c-47b1-a466-286bce5f8e6b.png',
    desc: 'Thawan standing giving a polite Thai wai (hands pressed together). Teacher Julie smiling approvingly from behind desk. Schoolroom setting. Cel-shaded storybook style.',
    chars: ['thawan', 'teacher_julie'] },
];

async function main() {
  console.log(`\n=== Re-hosting ${PAGES.length} Interview Practice pages 3-11 (Teacher Julie redesign) ===\n`);
  let done = 0, failed = 0;

  for (const entry of PAGES) {
    const { page, cdnUrl, desc, chars } = entry;
    const imgFileName = `ebook-interview-page-${page}.jpg`;
    const storagePath = `ebook-images/${imgFileName}`;
    try {
      console.log(`  [${done+failed+1}/${PAGES.length}] Page ${page}`);
      const imgRes = await fetch(cdnUrl);
      if (!imgRes.ok) throw new Error(`Download ${imgRes.status}`);
      let buf = Buffer.from(await imgRes.arrayBuffer());
      buf = await sharp(buf).resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();

      const { error: upErr } = await sb.storage.from('ebook-images').upload(imgFileName, buf, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(`Upload: ${upErr.message}`);

      const permanentUrl = `${SUPABASE_URL}/storage/v1/object/public/${storagePath}`;

      // Update ebook_pages image_url
      const { error: dbErr } = await sb.from('ebook_pages').update({ image_url: permanentUrl })
        .eq('subject_id', SUBJECT_ID).eq('page_number', page);
      if (dbErr) throw new Error(`DB update: ${dbErr.message}`);

      // Upsert image_catalog with proper description
      await sb.from('image_catalog').upsert({
        storage_path: storagePath,
        public_url: permanentUrl,
        description: desc,
        characters: chars,
        contains_text: false,
        quality_flag: null,
        described_at: new Date().toISOString()
      }, { onConflict: 'storage_path' });

      done++;
      console.log(`    OK (${(buf.length/1024).toFixed(0)}KB)`);
    } catch (e) { failed++; console.error(`    FAILED: ${e.message}`); }
  }

  console.log(`\n=== Complete: ${done}/${PAGES.length} success, ${failed} failed ===`);

  // Health check
  const { data: check } = await sb.from('ebook_pages').select('page_number, image_url')
    .eq('subject_id', SUBJECT_ID).order('page_number');
  console.log('\nHealth check (all 12 pages):');
  for (const r of check || []) {
    const hasCF = r.image_url?.includes('cloudfront');
    console.log(`  p${r.page_number}: ${r.image_url ? (hasCF ? 'CLOUDFRONT (BAD!)' : 'OK') : 'MISSING'}`);
  }

  // Catalog check for pages 3-11
  const { data: catCheck } = await sb.from('image_catalog').select('storage_path, description')
    .in('storage_path', PAGES.map(p => `ebook-images/ebook-interview-page-${p.page}.jpg`));
  console.log(`\nCatalog: ${(catCheck||[]).length}/${PAGES.length} entries`);
  for (const c of catCheck || []) {
    console.log(`  ${c.storage_path}: ${c.description ? 'described' : 'NULL DESCRIPTION!'}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
