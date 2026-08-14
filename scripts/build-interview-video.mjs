#!/usr/bin/env node
/**
 * build-interview-video.mjs
 *
 * Builds the interview-questions ad creative (FB/IG boost + TikTok post):
 * five approved stills, English narration, Ken Burns push, fixed text band.
 *
 *   node scripts/build-interview-video.mjs
 *
 * Image durations are DRIVEN BY THE ACTUAL NARRATION, not hand-guessed: each
 * question is synthesised separately via ElevenLabs /with-timestamps, and the
 * image stays up for exactly that clip's measured length plus the pause after it.
 */
import { config as loadEnv } from "dotenv";
import { execSync } from "child_process";
import { readdirSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

loadEnv({ path: ".env.local" });
loadEnv();

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY is not set");
  process.exit(1);
}

// Same voice as the e-books and the Interview Practice storybook.
const VOICE_ID = "C1npRmjB19a6yNkEucvx";
const MODEL_ID = "eleven_multilingual_v2";
const SPEED = 0.85;

const RAW = "assets/marketing/raw";
const OUT = "assets/marketing/out";
const TMP = "assets/marketing/tmp";

const GAP_SEC = 0.7;      // pause between questions
const END_CARD_SEC = 2.5; // final card

// English only. English IS the product demonstration — do not narrate in Thai.
const QUESTIONS = [
  { n: 1, text: "What is your name?" },
  { n: 2, text: "How old are you?" },
  { n: 3, text: "What is your favourite colour?" },
  { n: 4, text: "Do you have any brothers or sisters?" },
  { n: 5, text: "What do you like to do?" },
];

// Thai has no word spaces, so libass cannot wrap this itself — an unbroken
// 46-character hook renders as one over-wide line and is clipped at BOTH edges.
// The breaks below are explicit and chosen at sensible phrase boundaries.
const THAI_HOOK = "5 คำถามที่เด็กมักเจอ\nในการสอบสัมภาษณ์\nเข้าโรงเรียน";
const END_CARD_LINE1 = "ทดลองใช้ฟรี 7 วัน";
const END_CARD_LINE2 = "englishallstars.com";

for (const d of [OUT, TMP]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const dur = (f) =>
  parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`, {
      encoding: "utf8",
    }).trim()
  );

// ── 1. Glob the source images. Do NOT hardcode names — at least one has a
//       double extension (interview-01.png.png).
const images = readdirSync(RAW)
  .filter((f) => /^interview-0\d.*\.png$/i.test(f))
  .sort();

console.log(`Found ${images.length} interview images in ${RAW}:`);
for (const f of images) {
  const [w, h] = execSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${RAW}/${f}"`,
    { encoding: "utf8" }
  )
    .trim()
    .split(",");
  console.log(`  ${f}  ${w}x${h}`);
}
if (images.length !== QUESTIONS.length) {
  console.error(`Expected ${QUESTIONS.length} images, found ${images.length}. Stopping.`);
  process.exit(1);
}

// ── 2. Narration, one clip per question, with word timestamps.
async function synth(q) {
  const outPath = `${TMP}/interview-q${q.n}.mp3`;
  const jsonPath = `${TMP}/interview-q${q.n}.json`;

  if (existsSync(outPath) && existsSync(jsonPath)) {
    console.log(`  q${q.n}: cached`);
    return { ...q, path: outPath, timings: JSON.parse(readFileSync(jsonPath, "utf8")) };
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: q.text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: SPEED },
    }),
  });
  if (!res.ok) {
    console.error(`ElevenLabs failed for q${q.n}: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  writeFileSync(outPath, Buffer.from(data.audio_base64, "base64"));

  const a = data.alignment;
  const timings = {
    firstWordStart: a.character_start_times_seconds[0],
    lastWordEnd: a.character_end_times_seconds[a.character_end_times_seconds.length - 1],
  };
  writeFileSync(jsonPath, JSON.stringify(timings, null, 2));
  console.log(`  q${q.n}: "${q.text}" -> ${outPath}`);
  return { ...q, path: outPath, timings };
}

console.log("\nSynthesising narration (ElevenLabs /with-timestamps)...");
const clips = [];
for (const q of QUESTIONS) clips.push(await synth(q));

for (const c of clips) c.duration = dur(c.path);
console.log("\nMeasured clip durations:");
for (const c of clips) console.log(`  q${c.n}: ${c.duration.toFixed(3)}s`);

// ── 3. Concatenate narration with real silence between questions, plus the
//       end-card tail, so audio and image timeline share one clock.
const silence = `${TMP}/gap.wav`;
execSync(
  `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${GAP_SEC} -c:a pcm_s16le "${silence}" 2>${process.platform === "win32" ? "NUL" : "/dev/null"}`,
  { stdio: "ignore" }
);
const tail = `${TMP}/tail.wav`;
execSync(
  `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${END_CARD_SEC} -c:a pcm_s16le "${tail}" 2>${process.platform === "win32" ? "NUL" : "/dev/null"}`,
  { stdio: "ignore" }
);

const concatList = `${TMP}/concat.txt`;
const parts = [];
for (const c of clips) {
  parts.push(`file '${resolve(c.path).replace(/\\/g, "/")}'`);
  parts.push(`file '${resolve(silence).replace(/\\/g, "/")}'`);
}
parts.push(`file '${resolve(tail).replace(/\\/g, "/")}'`);
writeFileSync(concatList, parts.join("\n"));

const narration = `${TMP}/interview-narration.mp3`;
execSync(
  `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -b:a 128k "${narration}"`,
  { stdio: "ignore" }
);
const narrationDur = dur(narration);
console.log(`\nNarration assembled: ${narrationDur.toFixed(2)}s`);

// ── 4. End card image (solid brand sky-dark).
const endCard = `${TMP}/end-card.png`;
execSync(
  `ffmpeg -y -f lavfi -i color=c=0x0288D1:s=1080x1920 -frames:v 1 "${endCard}"`,
  { stdio: "ignore" }
);

// ── 5. Timeline. Each image is on screen for its question plus the gap after.
const timeline = [];
let t = 0;
for (const c of clips) {
  const d = c.duration + GAP_SEC;
  timeline.push({ ...c, start: t, end: t + d, duration: d });
  t += d;
}
const endCardStart = t;
const totalDur = t + END_CARD_SEC;

// ── 6. Overlays.
const overlays = [];

// Thai hook: persistent, identical position for the whole question section.
overlays.push({ text: THAI_HOOK, startSec: 0, endSec: endCardStart, style: "thai" });

// English question: holds until the next question starts (never blanks).
// Minimum 1.2s on screen is guaranteed by clip duration + 0.7s gap.
for (const item of timeline) {
  overlays.push({
    text: item.text,
    startSec: +item.start.toFixed(3),
    endSec: +item.end.toFixed(3),
    style: "english",
  });
}

// End card, same band and styling. Explicit per-line offsets so the offer reads
// ABOVE the URL — the style defaults would stack them the other way round and
// leave a 320px gap between them.
overlays.push({
  text: END_CARD_LINE1,
  startSec: +endCardStart.toFixed(3),
  endSec: +totalDur.toFixed(3),
  style: "thai",
  offsetY: 560,
});
overlays.push({
  text: END_CARD_LINE2,
  startSec: +endCardStart.toFixed(3),
  endSec: +totalDur.toFixed(3),
  style: "english",
  offsetY: 420,
});

const stillsConfig = {
  // Explicit numeric offsets from the bottom of the 1080x1920 frame.
  // Thai hook at 380 clears the 320px TikTok safe zone; the English question
  // sits directly ABOVE it at 520 and is accented so the two never read as one
  // sentence. These are config values, not auto-positioning.
  layout: {
    thaiOffsetY: 380,
    // The Thai hook is three lines at 84px (~101px line height = ~303px tall),
    // sitting 380..683 from the bottom. The English question is anchored above
    // that block and grows upward when a question wraps, so the two can never
    // collide regardless of question length.
    englishOffsetY: 700,
    thaiSize: 84,
    englishSize: 96,
    englishColour: "&H004FD5FF", // #FFD54F warm yellow, ASS is &HBBGGRR
    // Symmetric so centred text is actually centred in the 1080px frame.
    marginL: 60,
    marginR: 60,
  },
  images: [
    ...timeline.map((item, i) => ({
      path: `${RAW}/${images[i]}`,
      duration: +item.duration.toFixed(3),
    })),
    { path: endCard, duration: END_CARD_SEC },
  ],
  overlays,
};

const configPath = `${TMP}/interview-stills.json`;
writeFileSync(configPath, JSON.stringify(stillsConfig, null, 2));

console.log("\nTimeline:");
for (const item of timeline)
  console.log(
    `  ${item.start.toFixed(2)}s - ${item.end.toFixed(2)}s  "${item.text}"  (${images[item.n - 1]})`
  );
console.log(`  ${endCardStart.toFixed(2)}s - ${totalDur.toFixed(2)}s  END CARD`);
console.log(`\nTotal: ${totalDur.toFixed(2)}s`);
console.log(`Config: ${configPath}`);

// ── 7. Render.
const outPath = `${OUT}/interview-questions.mp4`;
console.log("\nRendering...");
execSync(
  `node scripts/assemble-tiktok.mjs --stills "${configPath}" --audio "${narration}" --out "${outPath}"`,
  { stdio: "inherit" }
);
