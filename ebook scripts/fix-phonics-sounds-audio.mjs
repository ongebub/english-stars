// fix-phonics-sounds-audio.mjs — Regenerate Phonics Sounds audio with example words
// Run: node --env-file=.env.local "ebook scripts/fix-phonics-sounds-audio.mjs"
//
// For each card, builds audio text that naturally produces the sound via example words,
// calls ElevenLabs /with-timestamps, uploads MP3 to Supabase audio bucket (overwrite),
// and updates flashcards.example_en with two example words.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVEN_KEY   = process.env.ELEVENLABS_API_KEY;
const VOICE_ID     = 'C1npRmjB19a6yNkEucvx';
const MODEL_ID     = 'eleven_multilingual_v2';
const SPEED        = 0.85;

if (!SUPABASE_URL || !SERVICE_KEY || !ELEVEN_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const SUBJECT_ID = 'd2da9a60-a111-49c7-bc26-2e1c40034275'; // Phonics Sounds

// Audio text formats:
// Single letters: "[Letter]. [Letter] says the sound in [word1]. Like [word1]. Like [word2]."
// Digraphs/combos: "[Letters spelled]. Together they say the sound in [word1]. Like [word1]. Like [word2]."
// Vowel sounds: "Short [vowel]. Short [vowel] says the sound in [word1]. Like [word1]. Like [word2]."
//             / "Long [vowel]. Long [vowel] says the sound in [word1]. Like [word1]. Like [word2]."

const SOUND_DATA = {
  // Short vowels
  'Short A': { words: ['cat', 'hat'],     text: 'Short A. Short A says the sound in cat. Like cat. Like hat.' },
  'Short E': { words: ['bed', 'red'],     text: 'Short E. Short E says the sound in bed. Like bed. Like red.' },
  'Short I': { words: ['pig', 'sit'],     text: 'Short I. Short I says the sound in pig. Like pig. Like sit.' },
  'Short O': { words: ['hot', 'dog'],     text: 'Short O. Short O says the sound in hot. Like hot. Like dog.' },
  'Short U': { words: ['cup', 'bug'],     text: 'Short U. Short U says the sound in cup. Like cup. Like bug.' },
  // Long vowels
  'Long A':  { words: ['cake', 'rain'],   text: 'Long A. Long A says the sound in cake. Like cake. Like rain.' },
  'Long E':  { words: ['tree', 'feet'],   text: 'Long E. Long E says the sound in tree. Like tree. Like feet.' },
  'Long I':  { words: ['kite', 'bike'],   text: 'Long I. Long I says the sound in kite. Like kite. Like bike.' },
  'Long O':  { words: ['bone', 'boat'],   text: 'Long O. Long O says the sound in bone. Like bone. Like boat.' },
  'Long U':  { words: ['cute', 'flute'],  text: 'Long U. Long U says the sound in cute. Like cute. Like flute.' },
  // Digraphs
  'SH':  { words: ['ship', 'fish'],       text: 'S. H. Together they say the sound in ship. Like ship. Like fish.' },
  'CH':  { words: ['chip', 'cheese'],     text: 'C. H. Together they say the sound in chip. Like chip. Like cheese.' },
  'Soft TH': { words: ['thin', 'bath'],   text: 'Soft T. H. Soft T. H. says the sound in thin. Like thin. Like bath.' },
  'Hard TH': { words: ['this', 'mother'], text: 'Hard T. H. Hard T. H. says the sound in this. Like this. Like mother.' },
  'NG':  { words: ['ring', 'song'],       text: 'N. G. Together they say the sound in ring. Like ring. Like song.' },
  'WH':  { words: ['whale', 'white'],     text: 'W. H. Together they say the sound in whale. Like whale. Like white.' },
  // R-controlled vowels
  'AR':  { words: ['car', 'star'],        text: 'A. R. Together they say the sound in car. Like car. Like star.' },
  'OR':  { words: ['horn', 'fork'],       text: 'O. R. Together they say the sound in horn. Like horn. Like fork.' },
  'ER':  { words: ['her', 'water'],       text: 'E. R. Together they say the sound in her. Like her. Like water.' },
  'EAR': { words: ['ear', 'hear'],        text: 'E. A. R. Together they say the sound in ear. Like ear. Like hear.' },
  'AIR': { words: ['chair', 'fair'],      text: 'A. I. R. Together they say the sound in chair. Like chair. Like fair.' },
  // Vowel teams
  'OO (long)':  { words: ['moon', 'food'],   text: 'Long O. O. Long O. O. says the sound in moon. Like moon. Like food.' },
  'OO (short)': { words: ['book', 'foot'],   text: 'Short O. O. Short O. O. says the sound in book. Like book. Like foot.' },
  'OW': { words: ['cow', 'now'],          text: 'O. W. Together they say the sound in cow. Like cow. Like now.' },
  'OI': { words: ['coin', 'boy'],         text: 'O. I. Together they say the sound in coin. Like coin. Like boy.' },
  'AI': { words: ['rain', 'train'],       text: 'A. I. Together they say the sound in rain. Like rain. Like train.' },
  'EA': { words: ['eat', 'beach'],        text: 'E. A. Together they say the sound in eat. Like eat. Like beach.' },
  // Single consonants
  'B': { words: ['ball', 'bear'],    text: 'B. B says the sound in ball. Like ball. Like bear.' },
  'D': { words: ['dog', 'door'],     text: 'D. D says the sound in dog. Like dog. Like door.' },
  'F': { words: ['fish', 'fun'],     text: 'F. F says the sound in fish. Like fish. Like fun.' },
  'G': { words: ['goat', 'game'],    text: 'G. G says the sound in goat. Like goat. Like game.' },
  'H': { words: ['hat', 'house'],    text: 'H. H says the sound in hat. Like hat. Like house.' },
  'J': { words: ['jet', 'jump'],     text: 'J. J says the sound in jet. Like jet. Like jump.' },
  'K': { words: ['kite', 'king'],    text: 'K. K says the sound in kite. Like kite. Like king.' },
  'L': { words: ['lamp', 'lion'],    text: 'L. L says the sound in lamp. Like lamp. Like lion.' },
  'M': { words: ['map', 'moon'],     text: 'M. M says the sound in map. Like map. Like moon.' },
  'N': { words: ['net', 'nose'],     text: 'N. N says the sound in net. Like net. Like nose.' },
  'P': { words: ['pen', 'pig'],      text: 'P. P says the sound in pen. Like pen. Like pig.' },
  'R': { words: ['red', 'run'],      text: 'R. R says the sound in red. Like red. Like run.' },
  'S': { words: ['sun', 'sock'],     text: 'S. S says the sound in sun. Like sun. Like sock.' },
  'T': { words: ['top', 'ten'],      text: 'T. T says the sound in top. Like top. Like ten.' },
  'V': { words: ['van', 'vest'],     text: 'V. V says the sound in van. Like van. Like vest.' },
  'W': { words: ['wig', 'web'],      text: 'W. W says the sound in wig. Like wig. Like web.' },
  'Z': { words: ['zip', 'zoo'],      text: 'Z. Z says the sound in zip. Like zip. Like zoo.' },
};

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
  // Fetch existing cards
  const { data: existing, error: fetchErr } = await sb
    .from('flashcards')
    .select('id, word_en, audio_url, sort_order')
    .eq('subject_id', SUBJECT_ID)
    .order('sort_order');

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

  console.log(`\n=== Phonics Sounds Audio Fix ===`);
  console.log(`  Cards to update: ${existing.length}\n`);

  let ok = 0, failed = 0;

  for (let i = 0; i < existing.length; i++) {
    const card = existing[i];
    const data = SOUND_DATA[card.word_en];

    if (!data) {
      console.log(`  [${i+1}/${existing.length}] ${card.word_en} — SKIPPED (no mapping)`);
      continue;
    }

    const audioText = data.text;
    const exampleEn = data.words.join(', ');
    // Extract existing filename from audio_url
    const existingFilename = card.audio_url.split('/').pop();

    console.log(`  [${i+1}/${existing.length}] ${card.word_en}`);
    console.log(`    Text: "${audioText}"`);

    try {
      const { audio_base64 } = await generateAudio(audioText);
      if (!audio_base64) throw new Error('No audio_base64 returned');
      const audioBytes = Buffer.from(audio_base64, 'base64');

      // Upload with same filename (overwrite)
      const { error: upErr } = await sb.storage
        .from('audio')
        .upload(existingFilename, audioBytes, { contentType: 'audio/mpeg', upsert: true });
      if (upErr) throw new Error(`Upload: ${upErr.message}`);

      // Update example_en (audio_url stays the same since we use same filename)
      const { error: updErr } = await sb.from('flashcards')
        .update({ example_en: exampleEn })
        .eq('id', card.id);
      if (updErr) throw new Error(`Update: ${updErr.message}`);

      ok++;
      console.log(`    OK (${(audioBytes.length/1024).toFixed(0)} KB) — examples: ${exampleEn}`);
    } catch (err) {
      failed++;
      console.error(`    FAILED: ${err.message}`);
    }

    // Rate limit: 2s between calls
    if (i < existing.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n=== DONE: ${ok} success, ${failed} failed (of ${existing.length}) ===`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
