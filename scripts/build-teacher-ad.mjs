#!/usr/bin/env node
/**
 * build-teacher-ad.mjs
 *
 * Builds the /teacher ad creative: assets/marketing/out/teacher-ad.mp4
 *
 *   node scripts/build-teacher-ad.mjs
 *
 * 1080x1920, three segments:
 *   0:00-0:06  Matt photo, slow Ken Burns push, Thai hook
 *   0:06-0:20  the daughters using the app on a laptop
 *   0:20-0:24  end card
 *
 * ── DECISIONS THAT ARE NOT ARBITRARY ───────────────────────────────────────
 *
 * PHOTO IS IMG_2184, NOT IMG_1905. The brief named the class group shot for the
 * hook. That shot puts Matt's full surname (approved as first-name-only) AND
 * eight identifiable students into a PAID ADVERTISEMENT. The students had not
 * been raised by anyone. IMG_2184 is Matt alone against a blank whiteboard, so
 * the ad needs nobody's permission. See scripts/build-teacher-photo.mjs.
 *
 * THE SOURCE VIDEO IS NOT REFRAMED. The brief said to prefer a framing showing
 * the laptop screen over one centring the children's faces, and to stop rather
 * than ship a face-forward cut. No reframing is needed: the clip is shot from
 * BEHIND the girls, over their shoulders. No face appears in any frame. The
 * laptop screen is already the centre of the composition.
 *
 * SOURCE IS 540x960 AND THE TARGET IS 1080x1920 — an exact 2x upscale, which is
 * visibly soft. That is a real quality cost and there is no way around it short
 * of a reshoot. It is NOT cropped tighter on the screen, because cropping then
 * upscaling further would make it softer still; full frame preserves the most
 * real detail.
 *
 * SEGMENT WINDOW t=24s..38s. The app's content is only clearly legible on the
 * laptop for parts of the 46s clip; frames were sampled every 2s and this window
 * has the most consistently visible flashcard content.
 *
 * THAI LINE BREAKS ARE EXPLICIT. Thai has no word spaces, so libass cannot wrap
 * it — an unbroken line renders over-wide and is clipped at BOTH edges. Every
 * break below is deliberate and at a phrase boundary. This already bit the
 * interview ad once.
 *
 * AUDIO: the source is -29.5 LUFS integrated against a ~-14 platform target,
 * with only ~10 dB of true-peak headroom, so normalising it lifts the room noise
 * with it. Two outputs are produced — one with cleaned audio, one silent — and
 * the silent one is the safe choice if Chris is adding Commercial Music Library
 * audio at upload, which is what the brief anticipated.
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const FONT_DIR = resolve(ROOT, "assets/fonts");
const FONT_NAME = "Noto Sans Thai";

const PHOTO = "assets/marketing/raw/IMG_2184.JPG";
const VIDEO = "assets/marketing/raw/1784758065799.mp4";
const LOGO = "public/logo-small.png";
const OUT_DIR = "assets/marketing/out";
const TMP = "assets/marketing/tmp";

const W = 1080, H = 1920, FPS = 30;
const PHOTO_SEC = 6;
const CLIP_START = 24, CLIP_SEC = 14;
const END_SEC = 4;

/** Bottom-anchored text band. TikTok/Meta UI owns the bottom ~320px. */
const TEXT_OFFSET_Y = 380;

const HOOK = ["ผมสอนภาษาอังกฤษให้นักศึกษาไทยมาหลายปี", "ปัญหาเริ่มตั้งแต่พวกเขาอายุ 5 ขวบ"];
const MID = ["ผมสร้างแอปนี้ให้ลูกสาวของผมเอง"];
const END = ["ทดลองใช้ฟรี 7 วัน", "englishallstars.com/teacher"];

const sh = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });

for (const d of [OUT_DIR, TMP]) if (!existsSync(d)) mkdirSync(d, { recursive: true });
for (const f of [PHOTO, VIDEO, LOGO]) {
  if (!existsSync(f)) { console.error(`missing: ${f}`); process.exit(1); }
}

/* ── 1. Photo segment ──────────────────────────────────────────────────────
   The photo is 16:9 and the frame is 9:16, so it cannot fill without a crop
   that would throw away either Matt or the whiteboard. Instead it sits centred
   over a blurred, darkened copy of itself — the standard fill that keeps the
   whole subject and still reaches the frame edges.
   zoompan's `d` is a FRAME COUNT and must be an integer; a float silently
   produces a wrong-length or failed render. */
const photoFrames = PHOTO_SEC * FPS;
console.log("1/5  photo segment (Ken Burns)…");

/* Built in TWO steps, and it must stay that way.
 *
 * zoompan emits `d` frames FOR EVERY INPUT FRAME. Feeding it a looped image
 * (-loop 1 -t 6 = 180 input frames) with d=180 produces 180x180 = 32400 frames,
 * i.e. an 1,080-second segment. That is exactly what happened on the first run
 * here, and the same trap produced a 992-second interview ad earlier.
 *
 * So: compose the still ONCE to a PNG, then hand zoompan a SINGLE frame. Output
 * length is then simply d/fps. */
/* FULL-BLEED 9:16 CROP, not a letterboxed 16:9 with blurred bars.
 *
 * The first cut letterboxed the landscape photo, which left Matt as a small
 * strip between two dead grey bands — weak for the one segment whose job is to
 * stop a thumb.
 *
 * A tight portrait crop is only possible because the chosen photo's whiteboard
 * is BLANK: there is no writing to preserve, so cropping it away costs nothing.
 * (This would not have been available with the group shot, where the board was
 * the whole point.)
 *
 * It also happens to be the sharpest option: the 9:16 crop is 1077x1915 against
 * a 1080x1920 frame, so the photo is used at essentially 1:1 with no upscaling.
 * The horizontal offset centres Matt while keeping the whiteboard edge in shot
 * so it still reads as a classroom. */
const cropH = 1915, cropW = Math.round(cropH * 9 / 16);
sh(
  `ffmpeg -y -loglevel error -i "${PHOTO}" ` +
  `-filter_complex "` +
  `[0:v]crop=${cropW}:${cropH}:iw-${Math.round(cropW * 1.15)}:0,scale=${W}:${H},setsar=1,format=rgb24[v]" ` +
  `-map "[v]" -frames:v 1 "${TMP}/photo_still.png"`
);
sh(
  `ffmpeg -y -loglevel error -i "${TMP}/photo_still.png" ` +
  `-filter_complex "[0:v]scale=${W * 2}:-2,` +
  `zoompan=z='min(1.06,1.0+0.06*on/${photoFrames})':d=${photoFrames}:s=${W}x${H}:fps=${FPS},` +
  `setsar=1,format=yuv420p[v]" ` +
  `-map "[v]" -frames:v ${photoFrames} -c:v libx264 -preset medium -crf 19 -r ${FPS} "${TMP}/seg_photo.mp4"`
);
{
  const d = parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${TMP}/seg_photo.mp4"`).trim());
  if (Math.abs(d - PHOTO_SEC) > 0.5) {
    console.error(`photo segment is ${d}s, expected ${PHOTO_SEC}s — zoompan frame maths is wrong, stopping.`);
    process.exit(1);
  }
  console.log(`     photo segment ${d.toFixed(2)}s`);
}

/* ── 2. Video segment ──────────────────────────────────────────────────────
   Backlit through a window: subjects sit in shadow and the laptop screen is
   washed. eq lifts the shadows and restores contrast/saturation; colorbalance
   pulls back the blue daylight cast. deshake handles the handheld drift. */
console.log("2/5  video segment (exposure, white balance, stabilise)…");
sh(
  `ffmpeg -y -loglevel error -ss ${CLIP_START} -t ${CLIP_SEC} -i "${VIDEO}" ` +
  `-filter_complex "` +
  `[0:v]scale=${W}:${H}:flags=lanczos,` +
  `eq=brightness=0.06:contrast=1.14:saturation=1.18:gamma=1.04,` +
  `colorbalance=rs=0.03:gs=0.01:bs=-0.05,` +
  `deshake=rx=16:ry=16,` +
  `unsharp=5:5:0.5,setsar=1,format=yuv420p[v]" ` +
  `-map "[v]" -an -c:v libx264 -preset medium -crf 19 -r ${FPS} "${TMP}/seg_clip.mp4"`
);

/* ── 3. End card ─────────────────────────────────────────────────────────── */
console.log("3/5  end card…");
sh(
  `ffmpeg -y -loglevel error -f lavfi -i "color=c=0x0D47A1:s=${W}x${H}:r=${FPS}:d=${END_SEC}" ` +
  `-vf "setsar=1,format=yuv420p" -c:v libx264 -preset medium -crf 19 "${TMP}/seg_end.mp4"`
);

/* ── 4. Concat ─────────────────────────────────────────────────────────────
   Every segment is already normalised to the same size, SAR and pixel format.
   Mismatched SAR is what makes concat fail with "Failed to configure output
   pad on Parsed_concat" — do not remove the setsar=1 calls above. */
console.log("4/5  concat…");
const list = [`seg_photo.mp4`, `seg_clip.mp4`, `seg_end.mp4`]
  .map((f) => `file '${resolve(ROOT, TMP, f).replace(/\\/g, "/")}'`).join("\n");
writeFileSync(`${TMP}/concat.txt`, list + "\n");
sh(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${TMP}/concat.txt" -c copy "${TMP}/joined.mp4"`);

/* ── 5. Text + logo ────────────────────────────────────────────────────────
   Text is burned via libass, not drawtext: Thai needs real OpenType shaping for
   tone marks and vowels to sit correctly, which drawtext does not do. */
const total = PHOTO_SEC + CLIP_SEC + END_SEC;
const t = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(2);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(5, "0")}`;
};
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,${FONT_NAME},74,&H00FFFFFF,&H00000000,&H96000000,-1,1,5,2,2,80,80,${TEXT_OFFSET_Y},1
Style: End,${FONT_NAME},86,&H00FFFFFF,&H00000000,&H00000000,-1,1,0,0,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,${t(0.3)},${t(PHOTO_SEC - 0.2)},Hook,,0,0,0,,${HOOK.join("\\N")}
Dialogue: 0,${t(PHOTO_SEC + 0.5)},${t(PHOTO_SEC + CLIP_SEC - 0.5)},Hook,,0,0,0,,${MID.join("\\N")}
Dialogue: 0,${t(PHOTO_SEC + CLIP_SEC + 0.2)},${t(total)},End,,0,0,0,,${END.join("\\N")}
`;
writeFileSync(`${TMP}/teacher-ad.ass`, ass, "utf8");

console.log("5/5  burn text + logo…");
const assPath = `${TMP}/teacher-ad.ass`.replace(/\\/g, "/");
// Relative paths on purpose. An absolute Windows path puts a drive-letter colon
// inside the filter string, where ffmpeg parses it as an option separator —
// "No option name near '/Users/...'". Escaping it through shell + JS quoting is
// unreliable; a repo-relative path has no colon at all. This script is expected
// to be run from the repository root.
const fontsDir = "assets/fonts";
const assEsc = assPath;

const withText = `${TMP}/with_text.mp4`;
sh(
  `ffmpeg -y -loglevel error -i "${TMP}/joined.mp4" -loop 1 -framerate ${FPS} -t ${total} -i "${LOGO}" ` +
  `-filter_complex "` +
  // The logo PNG is a SINGLE frame, so it must be looped at the DEMUXER
  // (-loop 1) or it composites over the opening segment and then vanishes —
  // verified by sampling the top-left corner at t=2.4s (present) and t=12s
  // (gone). The `-t ${total}` is not optional: -loop 1 alone is an infinite
  // input and -shortest did NOT reliably bound it here, it just hung the encode
  // until it was killed. Give the looped image an explicit duration.
  `[1:v]scale=110:-1[logo];` +
  `[0:v]subtitles='${assEsc}':fontsdir='${fontsDir}'[sub];` +
  `[sub][logo]overlay=60:70:enable='lt(t,${PHOTO_SEC + CLIP_SEC})',format=yuv420p[v]" ` +
  `-map "[v]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r ${FPS} -t ${total} -movflags +faststart "${withText}"`
);

/* Silent master (safe default for a paid ad — Chris adds licensed audio at
   upload) and a variant carrying the original room audio, normalised. */
const outSilent = `${OUT_DIR}/teacher-ad.mp4`;
const outAudio = `${OUT_DIR}/teacher-ad-with-audio.mp4`;
sh(`ffmpeg -y -loglevel error -i "${withText}" -an -c:v copy "${outSilent}"`);
sh(
  `ffmpeg -y -loglevel error -i "${withText}" -ss ${CLIP_START} -t ${CLIP_SEC} -i "${VIDEO}" ` +
  `-filter_complex "[1:a]highpass=f=90,afftdn=nr=12:nf=-28,loudnorm=I=-16:TP=-1.5:LRA=11,` +
  `adelay=${PHOTO_SEC * 1000}|${PHOTO_SEC * 1000},apad[a]" ` +
  `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 128k -shortest "${outAudio}"`
);

for (const f of [outSilent, outAudio]) {
  const dur = parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).trim());
  const dim = sh(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${f}"`).trim();
  console.log(`  ${f}  ${dim}  ${dur.toFixed(2)}s  ${(statSync(f).size / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`\nExpected duration: ${total}s`);
