// build-clockface-cards.mjs — Generate 36 SVG clockface flashcards, rasterize, upload, insert rows
// Run: node --env-file=.env.local "ebook scripts/build-clockface-cards.mjs"
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !ELEVENLABS_KEY) { console.error('Missing credentials'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const SUBJECT_ID = '1149568c-e72f-4f66-aa1b-acab72852055';
const VOICE_ID   = 'C1npRmjB19a6yNkEucvx';
const MODEL_ID   = 'eleven_multilingual_v2';
const SPEED      = 0.85;

// ── 36 times: 5:30 AM through 11:00 PM in 30-min intervals ──
const TIMES = [
  // AM
  { h12: 5, min: 30, meridiem: 'AM' },
  { h12: 6, min: 0,  meridiem: 'AM' },
  { h12: 6, min: 30, meridiem: 'AM' },
  { h12: 7, min: 0,  meridiem: 'AM' },
  { h12: 7, min: 30, meridiem: 'AM' },
  { h12: 8, min: 0,  meridiem: 'AM' },
  { h12: 8, min: 30, meridiem: 'AM' },
  { h12: 9, min: 0,  meridiem: 'AM' },
  { h12: 9, min: 30, meridiem: 'AM' },
  { h12: 10, min: 0,  meridiem: 'AM' },
  { h12: 10, min: 30, meridiem: 'AM' },
  { h12: 11, min: 0,  meridiem: 'AM' },
  { h12: 11, min: 30, meridiem: 'AM' },
  // PM
  { h12: 12, min: 0,  meridiem: 'PM' },
  { h12: 12, min: 30, meridiem: 'PM' },
  { h12: 1, min: 0,  meridiem: 'PM' },
  { h12: 1, min: 30, meridiem: 'PM' },
  { h12: 2, min: 0,  meridiem: 'PM' },
  { h12: 2, min: 30, meridiem: 'PM' },
  { h12: 3, min: 0,  meridiem: 'PM' },
  { h12: 3, min: 30, meridiem: 'PM' },
  { h12: 4, min: 0,  meridiem: 'PM' },
  { h12: 4, min: 30, meridiem: 'PM' },
  { h12: 5, min: 0,  meridiem: 'PM' },
  { h12: 5, min: 30, meridiem: 'PM' },
  { h12: 6, min: 0,  meridiem: 'PM' },
  { h12: 6, min: 30, meridiem: 'PM' },
  { h12: 7, min: 0,  meridiem: 'PM' },
  { h12: 7, min: 30, meridiem: 'PM' },
  { h12: 8, min: 0,  meridiem: 'PM' },
  { h12: 8, min: 30, meridiem: 'PM' },
  { h12: 9, min: 0,  meridiem: 'PM' },
  { h12: 9, min: 30, meridiem: 'PM' },
  { h12: 10, min: 0,  meridiem: 'PM' },
  { h12: 10, min: 30, meridiem: 'PM' },
  { h12: 11, min: 0,  meridiem: 'PM' },
];

function to24(h12, meridiem) {
  if (meridiem === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

function spokenTime(h12, min) {
  const hourWords = ['twelve','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
  const tens = ['','','twenty','thirty','forty','fifty'];
  const ones = ['','one','two','three','four','five','six','seven','eight','nine'];
  const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];

  const hourWord = hourWords[h12] || hourWords[h12 % 12];
  // Capitalize first letter
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  if (min === 0) {
    return `${cap(hourWord)} o'clock.`;
  }
  // For :30
  if (min === 30) {
    return `${cap(hourWord)} thirty.`;
  }
  // Generic (not needed for this set but just in case)
  const minWord = min < 10 ? `oh ${ones[min]}` :
                  min < 20 ? teens[min - 10] :
                  `${tens[Math.floor(min/10)]}${ones[min%10] ? ' ' + ones[min%10] : ''}`;
  return `${cap(hourWord)} ${minWord}.`;
}

function isDaytime(h24) {
  // 5:30 AM (h24=5) through 6:00 PM (h24=18) = sun
  // 6:30 PM (h24=18.5) through 11:00 PM (h24=23) = moon
  // We check exact boundaries: daytime = h24 < 18 OR (h24 === 18 && min === 0)
  // But we receive h24 as integer + separate min check in caller
  return true; // placeholder, handled in buildSVG
}

function buildSVG(h12, min, meridiem) {
  const h24 = to24(h12, meridiem);
  const hourAngle = (h12 % 12) * 30 + min * 0.5;
  const minuteAngle = min * 6;

  // Determine day/night: daytime = 5:30AM through 6:00PM, night = 6:30PM through 11:00PM
  const totalMin24 = h24 * 60 + min;
  const isDay = totalMin24 <= 18 * 60; // up to 6:00 PM inclusive

  const cx = 512, cy = 512, radius = 400;

  // Background
  const bgColor = isDay ? '#E8F4FD' : '#1a1a3e';
  const faceColor = '#FFF8ED';
  const darkBrown = '#5A4A3A';

  // Build tick marks
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const angle = i * 6 - 90;
    const rad = angle * Math.PI / 180;
    const isHour = i % 5 === 0;
    const outerR = radius - 20;
    const innerR = isHour ? radius - 55 : radius - 35;
    const sw = isHour ? 4 : 1.5;
    const x1 = cx + innerR * Math.cos(rad);
    const y1 = cy + innerR * Math.sin(rad);
    const x2 = cx + outerR * Math.cos(rad);
    const y2 = cy + outerR * Math.sin(rad);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${darkBrown}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }

  // Numerals
  let numerals = '';
  for (let n = 1; n <= 12; n++) {
    const angle = n * 30 - 90;
    const rad = angle * Math.PI / 180;
    const numR = radius - 80;
    const x = cx + numR * Math.cos(rad);
    const y = cy + numR * Math.sin(rad);
    numerals += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" fill="${darkBrown}">${n}</text>`;
  }

  // Hands
  const hourRad = (hourAngle - 90) * Math.PI / 180;
  const minRad = (minuteAngle - 90) * Math.PI / 180;
  const hourLen = 200;
  const minLen = 300;

  const hx = cx + hourLen * Math.cos(hourRad);
  const hy = cy + hourLen * Math.sin(hourRad);
  const mx = cx + minLen * Math.cos(minRad);
  const my = cy + minLen * Math.sin(minRad);

  // Background motif
  let bgMotif = '';
  if (isDay) {
    // Sun in top-right
    bgMotif = `
      <circle cx="820" cy="180" r="60" fill="#FFD93D" opacity="0.6"/>
      <circle cx="820" cy="180" r="45" fill="#FFE066" opacity="0.8"/>
      ${[0,45,90,135,180,225,270,315].map(a => {
        const r = a * Math.PI / 180;
        return `<line x1="${820 + 65*Math.cos(r)}" y1="${180 + 65*Math.sin(r)}" x2="${820 + 85*Math.cos(r)}" y2="${180 + 85*Math.sin(r)}" stroke="#FFD93D" stroke-width="6" stroke-linecap="round" opacity="0.5"/>`;
      }).join('')}`;
  } else {
    // Moon + stars
    bgMotif = `
      <circle cx="810" cy="180" r="45" fill="#E8E8FF" opacity="0.7"/>
      <circle cx="830" cy="165" r="40" fill="${bgColor}"/>
      <circle cx="750" cy="120" r="4" fill="#E8E8FF" opacity="0.8"/>
      <circle cx="900" cy="230" r="3" fill="#E8E8FF" opacity="0.7"/>
      <circle cx="870" cy="100" r="3.5" fill="#E8E8FF" opacity="0.6"/>
      <circle cx="700" cy="200" r="2.5" fill="#E8E8FF" opacity="0.5"/>
      <circle cx="930" cy="150" r="3" fill="#E8E8FF" opacity="0.7"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${bgColor}" rx="40"/>
  ${bgMotif}
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${faceColor}" stroke="${darkBrown}" stroke-width="14"/>
  ${ticks}
  ${numerals}
  <line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${darkBrown}" stroke-width="14" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="${darkBrown}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="18" fill="${darkBrown}"/>
</svg>`;
}

async function ttsAudio(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: SPEED } })
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log(`\n=== Building ${TIMES.length} clockface flashcards ===\n`);

  // Math verification
  console.log('Hand angle verification:');
  for (const t of [
    { h12: 5, min: 30, expectH: 165, expectM: 180 },
    { h12: 9, min: 0,  expectH: 270, expectM: 0 },
    { h12: 12, min: 30, expectH: 15, expectM: 180 },
    { h12: 11, min: 0, expectH: 330, expectM: 0 },
  ]) {
    const ha = (t.h12 % 12) * 30 + t.min * 0.5;
    const ma = t.min * 6;
    const ok = ha === t.expectH && ma === t.expectM;
    console.log(`  ${t.h12}:${String(t.min).padStart(2,'0')} -> hour=${ha} (expect ${t.expectH}), min=${ma} (expect ${t.expectM}) ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) { console.error('MATH CHECK FAILED, aborting'); process.exit(1); }
  }

  let done = 0, failed = 0;

  for (let i = 0; i < TIMES.length; i++) {
    const t = TIMES[i];
    const h24 = to24(t.h12, t.meridiem);
    const h24str = String(h24).padStart(2, '0') + String(t.min).padStart(2, '0');
    const wordEn = `${t.h12}:${String(t.min).padStart(2, '0')} ${t.meridiem}`;
    const spoken = spokenTime(t.h12, t.min);
    const sortOrder = 9 + i;

    const imgFileName = `time-clock-${h24str}.png`;
    const imgStoragePath = `flashcard-images/${imgFileName}`;
    const audioFileName = `time-clock-${h24str}.mp3`;

    try {
      console.log(`  [${i+1}/${TIMES.length}] ${wordEn} (sort=${sortOrder}) -> "${spoken}"`);

      // 1. Build SVG and rasterize
      const svgStr = buildSVG(t.h12, t.min, t.meridiem);
      const pngBuf = await sharp(Buffer.from(svgStr))
        .resize(1024, 1024)
        .png()
        .toBuffer();

      // 2. Upload image
      const { error: upErr } = await sb.storage.from('flashcard-images').upload(imgFileName, pngBuf, { contentType: 'image/png', upsert: true });
      if (upErr) throw new Error(`Img upload: ${upErr.message}`);
      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${imgStoragePath}`;

      // 3. Generate audio
      const audioBuf = await ttsAudio(spoken);
      const { error: audErr } = await sb.storage.from('audio').upload(audioFileName, audioBuf, { contentType: 'audio/mpeg', upsert: true });
      if (audErr) throw new Error(`Audio upload: ${audErr.message}`);
      const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/audio/${audioFileName}`;

      // 4. Insert flashcard row
      const { error: dbErr } = await sb.from('flashcards').insert({
        subject_id: SUBJECT_ID,
        word_en: wordEn,
        word_th: null,
        image_url: imageUrl,
        audio_url: audioUrl,
        sort_order: sortOrder,
        example_en: null,
        example_th: null,
        flagged: false,
        reviewed: false,
      });
      if (dbErr) throw new Error(`DB insert: ${dbErr.message}`);

      // 5. Image catalog
      await sb.from('image_catalog').upsert({
        storage_path: imgStoragePath,
        public_url: imageUrl,
        description: `Clockface flashcard showing ${wordEn}. Programmatic SVG with ${t.meridiem === 'PM' && to24(t.h12, t.meridiem) * 60 + t.min > 18 * 60 ? 'night' : 'day'} background.`,
        characters: [],
        contains_text: true,
        quality_flag: null,
        described_at: new Date().toISOString()
      }, { onConflict: 'storage_path' });

      done++;
      console.log(`    OK (img ${(pngBuf.length/1024).toFixed(0)}KB, audio ${(audioBuf.length/1024).toFixed(0)}KB)`);
    } catch (e) {
      failed++;
      console.error(`    FAILED: ${e.message}`);
    }
  }

  console.log(`\n=== Complete: ${done}/${TIMES.length} success, ${failed} failed ===`);

  // Health check
  const { data } = await sb.from('flashcards').select('word_en, word_th, sort_order, image_url, audio_url')
    .eq('subject_id', SUBJECT_ID).order('sort_order');
  console.log(`\nHealth check: ${data?.length} total flashcards for Time & Daily Routines`);
  for (const r of data || []) {
    console.log(`  [${r.sort_order}] ${r.word_en}: img=${r.image_url ? 'OK' : 'MISSING'} audio=${r.audio_url ? 'OK' : 'MISSING'} word_th=${r.word_th ?? 'NULL'}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
