// fix-phonics-blending-audio.mjs — Regenerate Phonics Blending audio with example words
// Run: node --env-file=.env.local "ebook scripts/fix-phonics-blending-audio.mjs"
//
// For each card, builds 3-part audio text that naturally produces the compound sound,
// calls ElevenLabs /with-timestamps, uploads MP3 to Supabase audio bucket (overwrite),
// and updates flashcards.example_en with the two example words.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVEN_KEY   = process.env.ELEVENLABS_API_KEY;
const VOICE_ID     = 'C1npRmjB19a6yNkEucvx';
const MODEL_ID     = 'eleven_multilingual_v2';
const SPEED        = 0.85;

if (!SUPABASE_URL || !SERVICE_KEY || !ELEVEN_KEY) {
  console.error('Missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const SUBJECT_ID = '7ffa2be3-1bb4-4312-aac9-579335be132e'; // Phonics Blending

// Matt-approved word lists: first two words from each group
// BEGINNING blends use: "[Letters]. Together they say the sound in [word1]. Like [word1]. Like [word2]."
// ENDING blends use: "[Letters]. Together they say the sound at the end of [word1]. Like [word1]. Like [word2]."
const BLEND_DATA = {
  // Beginning L-blends
  BL: { words: ['black', 'blue'],   type: 'beginning' },
  CL: { words: ['clap', 'clean'],   type: 'beginning' },
  FL: { words: ['flag', 'flip'],    type: 'beginning' },
  GL: { words: ['glad', 'glue'],    type: 'beginning' },
  PL: { words: ['play', 'plant'],   type: 'beginning' },
  SL: { words: ['slide', 'slip'],   type: 'beginning' },
  // Beginning R-blends
  BR: { words: ['brag', 'brick'],   type: 'beginning' },
  CR: { words: ['crab', 'cry'],     type: 'beginning' },
  DR: { words: ['drag', 'drum'],    type: 'beginning' },
  FR: { words: ['frog', 'fresh'],   type: 'beginning' },
  GR: { words: ['green', 'grab'],   type: 'beginning' },
  PR: { words: ['pray', 'prize'],   type: 'beginning' },
  TR: { words: ['trap', 'tree'],    type: 'beginning' },
  // Beginning S-blends
  SC: { words: ['scan', 'scar'],    type: 'beginning' },
  SK: { words: ['skip', 'skid'],    type: 'beginning' },
  SM: { words: ['small', 'smell'],  type: 'beginning' },
  SN: { words: ['snap', 'snow'],    type: 'beginning' },
  SP: { words: ['spin', 'spot'],    type: 'beginning' },
  ST: { words: ['stop', 'star'],    type: 'beginning' },
  SW: { words: ['swim', 'sweet'],   type: 'beginning' },
  // Beginning 3-letter blends
  SCR: { words: ['scrap', 'scream'],   type: 'beginning' },
  SPL: { words: ['split', 'splash'],   type: 'beginning' },
  SPR: { words: ['spray', 'spring'],   type: 'beginning' },
  STR: { words: ['strip', 'strap'],    type: 'beginning' },
  SQU: { words: ['squat', 'squid'],    type: 'beginning' },
  THR: { words: ['three', 'throw'],    type: 'beginning' },
  // Ending blends
  '-FT': { words: ['left', 'soft'],    type: 'ending', letters: 'F. T.' },
  '-LK': { words: ['milk', 'silk'],    type: 'ending', letters: 'L. K.' },
  '-LP': { words: ['help', 'yelp'],    type: 'ending', letters: 'L. P.' },
  '-LT': { words: ['belt', 'melt'],    type: 'ending', letters: 'L. T.' },
  '-MP': { words: ['camp', 'jump'],    type: 'ending', letters: 'M. P.' },
  '-ND': { words: ['hand', 'sand'],    type: 'ending', letters: 'N. D.' },
  '-NK': { words: ['pink', 'sink'],    type: 'ending', letters: 'N. K.' },
  '-NT': { words: ['tent', 'ant'],     type: 'ending', letters: 'N. T.' },
  '-PT': { words: ['kept', 'slept'],   type: 'ending', letters: 'P. T.' },
  '-SK': { words: ['desk', 'mask'],    type: 'ending', letters: 'S. K.' },
  '-SP': { words: ['gasp', 'wasp'],    type: 'ending', letters: 'S. P.' },
  '-ST': { words: ['fast', 'nest'],    type: 'ending', letters: 'S. T.' },
};

function buildAudioText(wordEn, data) {
  const letters = data.letters || wordEn.split('').join('. ') + '.';
  const [w1, w2] = data.words;
  if (data.type === 'ending') {
    return `${letters} Together they say the sound at the end of ${w1}. Like ${w1}. Like ${w2}.`;
  }
  return `${letters} Together they say the sound in ${w1}. Like ${w1}. Like ${w2}.`;
}

function audioFilename(wordEn) {
  // existing convention: blend-tr.mp3, blend-bl.mp3
  // for ending blends: blend-end-ft.mp3
  const clean = wordEn.replace('-', '').toLowerCase();
  if (wordEn.startsWith('-')) {
    return `blend-end-${clean}.mp3`;
  }
  return `blend-${clean}.mp3`;
}

async function generateAudio(text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: SPEED },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  // 1. Fetch existing cards
  const { data: existing, error: fetchErr } = await sb
    .from('flashcards')
    .select('id, word_en, audio_url, sort_order')
    .eq('subject_id', SUBJECT_ID)
    .order('sort_order');

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

  const existingMap = new Map(existing.map(c => [c.word_en, c]));
  const maxSort = Math.max(...existing.map(c => c.sort_order), 0);

  // 2. Build full task list (existing + missing)
  const allBlends = Object.keys(BLEND_DATA);
  const tasks = [];

  for (const blend of allBlends) {
    const card = existingMap.get(blend);
    tasks.push({
      wordEn: blend,
      id: card?.id || null,
      isNew: !card,
      sortOrder: card?.sort_order || null,
    });
  }

  // Assign sort_order for new cards
  let nextSort = maxSort + 1;
  for (const t of tasks) {
    if (t.isNew) {
      t.sortOrder = nextSort++;
    }
  }

  const existingCount = tasks.filter(t => !t.isNew).length;
  const newCount = tasks.filter(t => t.isNew).length;
  console.log(`\n=== Phonics Blending Audio Fix ===`);
  console.log(`  Existing cards to update: ${existingCount}`);
  console.log(`  New cards to create: ${newCount}`);
  console.log(`  Total: ${tasks.length}\n`);

  let ok = 0, failed = 0;

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const data = BLEND_DATA[t.wordEn];
    const audioText = buildAudioText(t.wordEn, data);
    const filename = audioFilename(t.wordEn);
    const exampleEn = data.words.join(', ');

    console.log(`  [${i+1}/${tasks.length}] ${t.wordEn} ${t.isNew ? '(NEW)' : '(UPDATE)'}`);
    console.log(`    Text: "${audioText}"`);

    try {
      // Generate audio
      const { audio_base64 } = await generateAudio(audioText);
      if (!audio_base64) throw new Error('No audio_base64 returned');
      const audioBytes = Buffer.from(audio_base64, 'base64');

      // Upload to Supabase audio bucket (upsert)
      const { error: upErr } = await sb.storage
        .from('audio')
        .upload(filename, audioBytes, { contentType: 'audio/mpeg', upsert: true });
      if (upErr) throw new Error(`Upload: ${upErr.message}`);

      const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/audio/${filename}`;

      if (t.isNew) {
        // Create image URL following convention (placeholder — no image yet for new blends)
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/flashcard-images/fc2-phonics-blending-${t.wordEn.replace('-', '').toLowerCase()}.jpg`;

        // Insert new flashcard row
        const { error: insErr } = await sb.from('flashcards').insert({
          subject_id: SUBJECT_ID,
          word_en: t.wordEn,
          example_en: exampleEn,
          audio_url: audioUrl,
          image_url: imageUrl,
          sort_order: t.sortOrder,
        });
        if (insErr) throw new Error(`Insert: ${insErr.message}`);
      } else {
        // Update existing card
        const { error: updErr } = await sb.from('flashcards')
          .update({ audio_url: audioUrl, example_en: exampleEn })
          .eq('id', t.id);
        if (updErr) throw new Error(`Update: ${updErr.message}`);
      }

      ok++;
      console.log(`    OK (${(audioBytes.length/1024).toFixed(0)} KB) — examples: ${exampleEn}`);
    } catch (err) {
      failed++;
      console.error(`    FAILED: ${err.message}`);
    }

    // Rate limit: 2s between calls
    if (i < tasks.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n=== DONE: ${ok} success, ${failed} failed (of ${tasks.length}) ===`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
