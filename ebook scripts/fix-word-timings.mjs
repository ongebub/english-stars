// fix-word-timings.mjs — Regenerate audio + word_timings for pages with malformed data
// Run: node --env-file=.env.local "ebook scripts/fix-word-timings.mjs"

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const VOICE_ID  = 'C1npRmjB19a6yNkEucvx';
const MODEL_ID  = 'eleven_multilingual_v2';
const SPEED     = 0.85;
const BATCH     = 20;
const DELAY_MS  = 2000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Call ElevenLabs /with-timestamps, return { audioBuf, wordTimings }
 * Applies Thawan -> Tawan substitution for pronunciation, then remaps back.
 */
async function generateWithTimestamps(text) {
  const hasThawan = /Thawan/gi.test(text);
  const ttsText = hasThawan ? text.replace(/Thawan/gi, 'Tawan') : text;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_KEY },
    body: JSON.stringify({
      text: ttsText,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: SPEED },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const audioBuf = Buffer.from(data.audio_base64, 'base64');

  // Build word-level timings from character alignment (parallel arrays format)
  const chars = data.alignment?.characters || [];
  const starts = data.alignment?.character_start_times_seconds || [];
  const ends = data.alignment?.character_end_times_seconds || [];
  const wordTimings = chars.reduce((acc, ch, i) => {
    if (ch === ' ' || ch === '\n') return acc;
    const prev = i > 0 ? chars[i - 1] : null;
    const lastWord = acc[acc.length - 1];
    if (lastWord && prev !== ' ' && prev !== '\n' && i > 0) {
      lastWord.word += ch;
      lastWord.end = ends[i];
    } else {
      acc.push({ word: ch, start: starts[i], end: ends[i] });
    }
    return acc;
  }, []);

  // Remap Tawan back to Thawan if substituted
  if (hasThawan) {
    for (const wt of wordTimings) {
      wt.word = wt.word.replace(/Tawan/gi, (m) => {
        return m[0] === 't' ? 'thawan' : 'Thawan';
      });
    }
  }

  return { audioBuf, wordTimings };
}

async function main() {
  // 1. Find all affected pages (NULL, or placeholder with null text/word field)
  const { data: affected, error: qErr } = await sb
    .from('ebook_pages')
    .select('id, subject_id, page_number, text_en, audio_url')
    .or('word_timings.is.null,word_timings.eq.[{"text": null}],word_timings.eq.[{"word": null}]')
    .order('page_number');

  if (qErr) { console.error('Query error:', qErr.message); process.exit(1); }
  if (!affected || affected.length === 0) { console.log('No affected pages found.'); return; }

  // Get slugs for filenames
  const subjectIds = [...new Set(affected.map(p => p.subject_id))];
  const { data: subjects } = await sb.from('subjects').select('id, slug, title_en').in('id', subjectIds);
  const slugMap = new Map(subjects.map(s => [s.id, s]));

  console.log(`\n=== Fixing ${affected.length} pages with malformed word_timings ===\n`);

  let done = 0, failed = 0;

  for (let i = 0; i < affected.length; i++) {
    const page = affected[i];
    const subj = slugMap.get(page.subject_id);
    const slug = subj?.slug || 'unknown';
    const title = subj?.title_en || 'Unknown';

    try {
      console.log(`  [${i + 1}/${affected.length}] "${title}" p${page.page_number} — generating audio...`);

      const { audioBuf, wordTimings } = await generateWithTimestamps(page.text_en);

      // Upload MP3 with same filename (overwrite)
      const fileName = `ebook-${slug}-page-${page.page_number}.mp3`;
      const { error: upErr } = await sb.storage.from('audio').upload(fileName, audioBuf, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
      if (upErr) throw new Error(`Upload: ${upErr.message}`);

      const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/audio/${fileName}`;

      // Update DB
      const { error: updErr } = await sb.from('ebook_pages').update({
        audio_url: audioUrl,
        word_timings: wordTimings,
      }).eq('id', page.id);
      if (updErr) throw new Error(`DB update: ${updErr.message}`);

      done++;
      console.log(`    done (${wordTimings.length} words, ${(audioBuf.length / 1024).toFixed(0)}KB)`);
    } catch (e) {
      failed++;
      console.error(`    FAILED: ${e.message}`);
    }

    // Batch delay
    if ((i + 1) % BATCH === 0 && i + 1 < affected.length) {
      console.log(`    --- batch pause ${DELAY_MS}ms ---`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n=== Complete: ${done} fixed, ${failed} failed out of ${affected.length} ===\n`);

  // Verification
  const { data: remaining } = await sb
    .from('ebook_pages')
    .select('id', { count: 'exact' })
    .or('word_timings.is.null,word_timings.eq.[{"text": null}],word_timings.eq.[{"word": null}]');
  console.log(`Remaining broken pages: ${remaining?.length ?? '?'}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
