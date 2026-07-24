// fix-thawan-audio.mjs — Regenerate audio for all rows mentioning "Thawan"
// Sends "Tawan" to ElevenLabs for correct Thai pronunciation, but NEVER changes display text.
// Run: node --env-file=.env.local "ebook scripts/fix-thawan-audio.mjs"

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !ELEVENLABS_API_KEY) {
  console.error('Missing credentials in env'); process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const VOICE_ID = 'C1npRmjB19a6yNkEucvx';
const MODEL_ID = 'eleven_multilingual_v2';
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 2000;

// ── Phonetic substitutions (audio only, never stored) ──────────────
const PHONETIC_SUBS = { 'Thawan': 'Tawan', 'thawan': 'tawan', 'THAWAN': 'TAWAN' };
function applyPhoneticSubs(text) {
  let result = text;
  for (const [written, spoken] of Object.entries(PHONETIC_SUBS)) {
    result = result.replaceAll(written, spoken);
  }
  return result;
}

// Reverse: map "Tawan" back to "Thawan" in word_timings
function remapTimingTokens(wordTimings) {
  return wordTimings.map(w => {
    let word = w.word;
    // Handle punctuation-attached forms like "Tawan." "Tawan," "Tawan!" etc.
    word = word.replace(/\bTawan\b/gi, (match) => {
      if (match === 'Tawan') return 'Thawan';
      if (match === 'tawan') return 'thawan';
      if (match === 'TAWAN') return 'THAWAN';
      return 'Thawan';
    });
    // Also handle cases where punctuation is attached (regex \b won't match before punctuation well)
    word = word.replace(/Tawan/g, 'Thawan');
    word = word.replace(/tawan/g, 'thawan');
    word = word.replace(/TAWAN/g, 'THAWAN');
    return { ...w, word };
  });
}

// ── Character-level alignment to word timings ──────────────────────
function charsToWords(characters, startTimes, endTimes) {
  const words = []; let cur = null;
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } continue; }
    if (!cur) cur = { word: ch, start: startTimes[i], end: endTimes[i] };
    else { cur.word += ch; cur.end = endTimes[i]; }
  }
  if (cur) words.push(cur);
  return words;
}

// ── ElevenLabs TTS helpers ─────────────────────────────────────────
async function ttsWithTimestamps(text, speed) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed }
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return res.json();
}

async function ttsPlain(text, speed) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed }
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Batch helper ───────────────────────────────────────────────────
async function processBatches(items, processFn) {
  let done = 0, failed = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    if (i > 0) {
      process.stdout.write(`  [batch delay ${BATCH_DELAY_MS}ms]\n`);
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
    const batch = items.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      try {
        await processFn(item);
        done++;
      } catch (err) {
        failed++;
        console.error(`  FAILED (${item.id}): ${err.message}`);
      }
    }
  }
  return { done, failed };
}

// Extract storage path from full URL
function storagePath(audioUrl) {
  // URL format: .../storage/v1/object/public/audio/FILENAME
  const m = audioUrl.match(/\/audio\/(.+)$/);
  return m ? m[1] : null;
}

// ── TABLE PROCESSORS ───────────────────────────────────────────────

// 1. FLASHCARDS — speed 0.85, no timestamps
async function processFlashcards() {
  console.log('\n=== FLASHCARDS ===');
  const { data: rows, error } = await sb.from('flashcards')
    .select('id, word_en, example_en, audio_url')
    .or('example_en.ilike.%Thawan%,word_en.ilike.%Thawan%');
  if (error) throw new Error(`Query flashcards: ${error.message}`);
  console.log(`  Found ${rows.length} rows`);

  return processBatches(rows, async (row) => {
    const origText = row.example_en || row.word_en;
    const ttsText = applyPhoneticSubs(origText);
    const filename = storagePath(row.audio_url);
    if (!filename) throw new Error(`Cannot parse audio_url: ${row.audio_url}`);

    process.stdout.write(`  ${row.id} "${origText.slice(0,40)}..." -> `);
    const audio = await ttsPlain(ttsText, 0.85);

    const { error: upErr } = await sb.storage.from('audio')
      .upload(filename, audio, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(`Upload: ${upErr.message}`);

    console.log(`ok (${(audio.length/1024).toFixed(0)} KB)`);
  });
}

// 2. EBOOK_PAGES — speed 0.85, with timestamps + word_timings update
async function processEbookPages() {
  console.log('\n=== EBOOK_PAGES ===');
  const { data: rows, error } = await sb.from('ebook_pages')
    .select('id, text_en, audio_url, word_timings')
    .ilike('text_en', '%Thawan%');
  if (error) throw new Error(`Query ebook_pages: ${error.message}`);
  console.log(`  Found ${rows.length} rows`);

  return processBatches(rows, async (row) => {
    const ttsText = applyPhoneticSubs(row.text_en);
    const filename = storagePath(row.audio_url);
    if (!filename) throw new Error(`Cannot parse audio_url: ${row.audio_url}`);

    process.stdout.write(`  ${row.id} "${row.text_en.slice(0,40)}..." -> `);
    const r = await ttsWithTimestamps(ttsText, 0.85);
    const audio = Buffer.from(r.audio_base64, 'base64');

    const { error: upErr } = await sb.storage.from('audio')
      .upload(filename, audio, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(`Upload: ${upErr.message}`);

    const { data: pub } = sb.storage.from('audio').getPublicUrl(filename);
    const a = r.alignment;
    let wordTimings = charsToWords(a.characters, a.character_start_times_seconds, a.character_end_times_seconds);
    wordTimings = remapTimingTokens(wordTimings);

    const { error: dbErr } = await sb.from('ebook_pages')
      .update({ audio_url: pub.publicUrl, word_timings: wordTimings })
      .eq('id', row.id);
    if (dbErr) throw new Error(`DB update: ${dbErr.message}`);

    console.log(`ok (${wordTimings.length} words, ${(audio.length/1024).toFixed(0)} KB)`);
  });
}

// 3. QUIZ_QUESTIONS — speed 1.0, no timestamps
async function processQuizQuestions() {
  console.log('\n=== QUIZ_QUESTIONS ===');
  const { data: rows, error } = await sb.from('quiz_questions')
    .select('id, prompt_en, audio_url')
    .ilike('prompt_en', '%Thawan%');
  if (error) throw new Error(`Query quiz_questions: ${error.message}`);
  console.log(`  Found ${rows.length} rows`);

  return processBatches(rows, async (row) => {
    const ttsText = applyPhoneticSubs(row.prompt_en);
    const filename = storagePath(row.audio_url);
    if (!filename) throw new Error(`Cannot parse audio_url: ${row.audio_url}`);

    process.stdout.write(`  ${row.id} "${row.prompt_en.slice(0,40)}..." -> `);
    const audio = await ttsPlain(ttsText, 1.0);

    const { error: upErr } = await sb.storage.from('audio')
      .upload(filename, audio, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(`Upload: ${upErr.message}`);

    console.log(`ok (${(audio.length/1024).toFixed(0)} KB)`);
  });
}

// 4. READER_PAGES — speed 0.85, with timestamps + word_timings update
async function processReaderPages() {
  console.log('\n=== READER_PAGES ===');
  const { data: rows, error } = await sb.from('reader_pages')
    .select('id, text_en, audio_url, word_timings')
    .ilike('text_en', '%Thawan%');
  if (error) throw new Error(`Query reader_pages: ${error.message}`);
  console.log(`  Found ${rows.length} rows`);

  return processBatches(rows, async (row) => {
    const ttsText = applyPhoneticSubs(row.text_en);
    const filename = storagePath(row.audio_url);
    if (!filename) throw new Error(`Cannot parse audio_url: ${row.audio_url}`);

    process.stdout.write(`  ${row.id} "${row.text_en.slice(0,40)}..." -> `);
    const r = await ttsWithTimestamps(ttsText, 0.85);
    const audio = Buffer.from(r.audio_base64, 'base64');

    const { error: upErr } = await sb.storage.from('audio')
      .upload(filename, audio, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(`Upload: ${upErr.message}`);

    const { data: pub } = sb.storage.from('audio').getPublicUrl(filename);
    const a = r.alignment;
    let wordTimings = charsToWords(a.characters, a.character_start_times_seconds, a.character_end_times_seconds);
    wordTimings = remapTimingTokens(wordTimings);

    const { error: dbErr } = await sb.from('reader_pages')
      .update({ audio_url: pub.publicUrl, word_timings: wordTimings })
      .eq('id', row.id);
    if (dbErr) throw new Error(`DB update: ${dbErr.message}`);

    console.log(`ok (${wordTimings.length} words, ${(audio.length/1024).toFixed(0)} KB)`);
  });
}

// ── MAIN ───────────────────────────────────────────────────────────
async function main() {
  console.log('=== fix-thawan-audio.mjs — Fixing "Thawan" pronunciation ===');
  console.log('Phonetic sub: Thawan -> Tawan (audio only, display text unchanged)\n');

  const results = {};
  results.flashcards    = await processFlashcards();
  results.ebook_pages   = await processEbookPages();
  results.quiz_questions = await processQuizQuestions();
  results.reader_pages  = await processReaderPages();

  console.log('\n=== SUMMARY ===');
  let totalDone = 0, totalFailed = 0;
  for (const [table, { done, failed }] of Object.entries(results)) {
    console.log(`  ${table}: ${done} success, ${failed} failed`);
    totalDone += done; totalFailed += failed;
  }
  console.log(`  TOTAL: ${totalDone} success, ${totalFailed} failed`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
