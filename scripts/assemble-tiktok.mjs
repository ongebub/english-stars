#!/usr/bin/env node
// assemble-tiktok.mjs — Assemble TikTok-ready MP4 from video/stills + audio + Thai overlays
// Usage:
//   Video mode:  node scripts/assemble-tiktok.mjs --video raw.mp4 --audio narration.mp3 --overlays config.json --out out.mp4
//   Stills mode: node scripts/assemble-tiktok.mjs --stills config.json --audio narration.mp3 --out out.mp4
//
// Overlays JSON: [{ "text": "...", "startSec": 0, "endSec": 3, "style": "thai|english" }]
//   style "thai"    = parent-directed Thai hook line (88px, persistent)
//   style "english" = English vocabulary word (104px, synced to speech)
//   Default style is "thai" if omitted.
//   All text renders in ONE fixed band above the TikTok bottom safe zone.

import { execSync, execFileSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_PATH = resolve(__dirname, "../assets/fonts/NotoSansThai-Bold.ttf");

// TikTok safe zones (at 1080x1920)
const SAFE = { top: 120, bottom: 320, right: 140 };
// Fixed text band: above bottom safe zone with margin
const TEXT_MARGIN_V = SAFE.bottom + 40;
const MARGIN_R = SAFE.right + 20;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--video")    opts.video = args[++i];
    if (args[i] === "--audio")    opts.audio = args[++i];
    if (args[i] === "--overlays") opts.overlays = args[++i];
    if (args[i] === "--stills")   opts.stills = args[++i];
    if (args[i] === "--out")      opts.out = args[++i];
  }
  return opts;
}

function checkFfmpeg() {
  try {
    const ver = execSync("ffmpeg -version", { encoding: "utf8" }).split("\n")[0];
    console.log(`ffmpeg: ${ver}`);
    const filters = execSync("ffmpeg -filters 2>&1", { encoding: "utf8" });
    if (!filters.includes("subtitles")) {
      console.error("ERROR: ffmpeg was not built with libass (subtitles filter missing).");
      process.exit(1);
    }
  } catch {
    console.error("ERROR: ffmpeg not found on PATH.");
    process.exit(1);
  }
}

function getMediaDuration(filePath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: "utf8" }
  );
  return parseFloat(out.trim());
}

/**
 * Generate ASS subtitle file with two styles:
 * - ThaiHook: 88px, white fill, black outline, for parent-directed Thai text
 * - EnglishWord: 104px, white fill, black outline, larger for vocab words
 * All text in ONE fixed band above TikTok bottom safe zone.
 */
function generateASS(overlays, outputPath, layout = {}) {
  const fontName = "Noto Sans Thai";

  // ASS color format: &HAABBGGRR (alpha, blue, green, red)
  const white = "&H00FFFFFF";
  const black = "&H00000000";
  const shadowBg = "&H80000000";

  // Explicit numeric vertical offsets, measured in pixels from the BOTTOM of the
  // 1080x1920 frame (Alignment 2 = bottom-centre). Never auto-positioned, never
  // centred — placement has been wrong on previous videos precisely because it
  // was inferred. Callers override via the `layout` block in the config.
  //
  // Defaults reproduce the previous hardcoded behaviour exactly so existing
  // videos re-render unchanged.
  const thaiOffsetY = layout.thaiOffsetY ?? TEXT_MARGIN_V + 120;
  const englishOffsetY = layout.englishOffsetY ?? TEXT_MARGIN_V;
  const thaiSize = layout.thaiSize ?? 88;
  const englishSize = layout.englishSize ?? 104;
  // Accent colour keeps the English question from reading as one sentence with
  // the Thai hook. ASS is &HBBGGRR, so this is a warm yellow (#FFD54F).
  const englishColour = layout.englishColour ?? white;
  // Horizontal margins. The defaults are asymmetric (20 left / 160 right) to
  // dodge TikTok's right-hand button column, which pulls centred text off-centre
  // by 70px. For bottom-band layouts, pass symmetric values.
  // Thai has NO WORD SPACES, so libass cannot line-break it: a long hook renders
  // as one over-wide line and is clipped at both edges. Break it yourself with
  // \n in the overlay text.
  const marginL = layout.marginL ?? 20;
  const marginR = layout.marginR ?? MARGIN_R;

  let ass = `[Script Info]
Title: TikTok Overlays
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ThaiHook,${fontName},${thaiSize},${white},${white},${black},${shadowBg},1,0,0,0,100,100,0,0,1,5,2,2,${marginL},${marginR},${thaiOffsetY},1
Style: EnglishWord,${fontName},${englishSize},${englishColour},${englishColour},${black},${shadowBg},1,0,0,0,100,100,0,0,1,5,2,2,${marginL},${marginR},${englishOffsetY},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const ov of overlays) {
    const style = ov.style === "english" ? "EnglishWord" : "ThaiHook";
    const layer = ov.style === "english" ? 1 : 0;
    const start = formatASSTime(ov.startSec);
    const end = formatASSTime(ov.endSec);
    const text = ov.text.replace(/\\/g, "\\\\").replace(/\n/g, "\\N");
    // Per-event MarginV overrides the style default (0 = inherit), letting a
    // single overlay sit at its own explicit height — needed when the usual
    // Thai-above-English stacking has to be reordered, e.g. on an end card.
    const mv = ov.offsetY ?? 0;
    ass += `Dialogue: ${layer},${start},${end},${style},,0,0,${mv},,${text}\n`;
  }

  writeFileSync(outputPath, ass, "utf8");
  return outputPath;
}

function formatASSTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assembleVideo(opts) {
  const { video, audio, overlays, out } = opts;

  if (!existsSync(video)) throw new Error(`Video not found: ${video}`);
  if (!existsSync(audio)) throw new Error(`Audio not found: ${audio}`);

  const videoDur = getMediaDuration(video);
  const audioDur = getMediaDuration(audio);

  console.log(`Video duration: ${videoDur.toFixed(2)}s`);
  console.log(`Audio duration: ${audioDur.toFixed(2)}s`);

  if (audioDur > videoDur + 0.5) {
    console.error(`ERROR: Narration (${audioDur.toFixed(1)}s) is LONGER than video (${videoDur.toFixed(1)}s).`);
    console.error("Extend the video or shorten the narration. Will not truncate audio.");
    process.exit(1);
  }

  // Generate ASS file
  const assPath = out.replace(/\.mp4$/i, ".ass");
  generateASS(overlays, assPath);

  // Copy ASS + font to clean temp dir (avoids Windows path escaping issues)
  const tmpDir = resolve(process.env.TEMP || "/tmp", "tiktok-build").replace(/\\/g, "/");
  try { execSync(`mkdir -p "${tmpDir}"`, { stdio: "ignore" }); } catch { /* exists */ }
  const tmpAss = `${tmpDir}/subs.ass`;
  const tmpFont = `${tmpDir}/NotoSansThai-Bold.ttf`;
  try { execSync(`cp "${assPath}" "${tmpAss}"`, { stdio: "ignore" }); } catch { writeFileSync(tmpAss, readFileSync(assPath)); }
  try { execSync(`cp "${FONT_PATH}" "${tmpFont}"`, { stdio: "ignore" }); } catch { writeFileSync(tmpFont, readFileSync(FONT_PATH)); }

  const tmpAssEsc = tmpAss.replace(/\\/g, "/").replace(/:/g, "\\:");
  const tmpDirEsc = tmpDir.replace(/\\/g, "/").replace(/:/g, "\\:");

  // BUG FIX: pad audio to video duration instead of using -shortest
  // apad pads with silence, atrim cuts to exact video length
  const cmd = [
    "ffmpeg", "-y",
    "-i", video,
    "-i", audio,
    "-filter_complex",
    `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,subtitles='${tmpAssEsc}':fontsdir='${tmpDirEsc}'[v];[1:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad,atrim=0:${videoDur.toFixed(3)}[a]`,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    out,
  ];

  console.log("\nRunning ffmpeg...");
  execFileSync(cmd[0], cmd.slice(1), { stdio: "inherit" });

  // Clean up
  try { unlinkSync(tmpAss); unlinkSync(tmpFont); } catch {}
  try { unlinkSync(assPath); } catch {}

  const stat = statSync(out);
  const outDur = getMediaDuration(out);
  console.log(`\nOutput: ${out}`);
  console.log(`Duration: ${outDur.toFixed(2)}s`);
  console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
}

function assembleStills(opts) {
  const { stills, audio, out } = opts;

  const config = JSON.parse(readFileSync(stills, "utf8"));
  const images = config.images;
  const overlays = config.overlays || [];

  if (!images || images.length === 0) throw new Error("No images in stills config");
  if (!existsSync(audio)) throw new Error(`Audio not found: ${audio}`);

  const audioDur = getMediaDuration(audio);
  const totalImageDur = images.reduce((sum, img) => sum + img.duration, 0);

  console.log(`Audio duration: ${audioDur.toFixed(2)}s`);
  console.log(`Total image duration: ${totalImageDur.toFixed(2)}s`);

  if (audioDur > totalImageDur + 0.5) {
    console.error(`ERROR: Narration (${audioDur.toFixed(1)}s) is LONGER than total image duration (${totalImageDur.toFixed(1)}s).`);
    process.exit(1);
  }

  const assPath = out.replace(/\.mp4$/i, ".ass");
  generateASS(overlays, assPath, config.layout || {});

  const tmpDir = resolve(process.env.TEMP || "/tmp", "tiktok-build").replace(/\\/g, "/");
  try { execSync(`mkdir -p "${tmpDir}"`, { stdio: "ignore" }); } catch { /* exists */ }
  const tmpAss = `${tmpDir}/subs.ass`;
  const tmpFont = `${tmpDir}/NotoSansThai-Bold.ttf`;
  try { execSync(`cp "${assPath}" "${tmpAss}"`, { stdio: "ignore" }); } catch { writeFileSync(tmpAss, readFileSync(assPath)); }
  try { execSync(`cp "${FONT_PATH}" "${tmpFont}"`, { stdio: "ignore" }); } catch { writeFileSync(tmpFont, readFileSync(FONT_PATH)); }
  const tmpAssEsc = tmpAss.replace(/\\/g, "/").replace(/:/g, "\\:");
  const tmpDirEsc = tmpDir.replace(/\\/g, "/").replace(/:/g, "\\:");

  // ONE frame per still. zoompan's `d` is output-frames-PER-INPUT-FRAME, so
  // pairing it with `-loop 1 -t <dur>` multiplies the two and produces a video
  // orders of magnitude too long (a 15s cut rendered as 992s). The still's
  // on-screen time is governed solely by `d` below.
  const inputs = images.map((img) => `-i "${img.path}"`).join(" ");
  const filters = images.map((img, i) => {
    // zoompan `d` is a FRAME COUNT and must be an integer — a fractional
    // duration (e.g. 2.465s -> 73.94999999999999) makes ffmpeg fail at frame 0
    // with a bare "Conversion failed!".
    const frames = Math.round(img.duration * 30);
    // setsar=1 + a common pixel format are REQUIRED before concat: it refuses to
    // configure its output pad if inputs disagree, which surfaces only as
    // "Failed to configure output pad on Parsed_concat". Source stills are RGB
    // with non-square SAR after the forced scale; a generated end card is
    // yuv420p. Normalise both before they meet.
    return `[${i}:v]scale=1200:2133,setsar=1,format=yuv420p,zoompan=z='min(zoom+0.0003,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30,setsar=1[v${i}]`;
  });
  const concatInputs = images.map((_, i) => `[v${i}]`).join("");
  filters.push(`${concatInputs}concat=n=${images.length}:v=1:a=0[vraw]`);
  filters.push(`[vraw]subtitles='${tmpAssEsc}':fontsdir='${tmpDirEsc}'[v]`);
  // Pad audio to total image duration
  filters.push(`[${images.length}:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad,atrim=0:${totalImageDur.toFixed(3)}[a]`);

  // -ar 44100: loudnorm resamples internally and the AAC encoder otherwise
  // inherits 96kHz, which is atypical for TikTok/Meta and inflates the file for
  // no audible gain.
  const cmd = `ffmpeg -y ${inputs} -i "${audio}" -filter_complex "${filters.join(";")}" -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -ar 44100 -movflags +faststart "${out}"`;

  console.log("\nRunning ffmpeg...");
  execSync(cmd, { stdio: "inherit" });

  try { unlinkSync(tmpAss); unlinkSync(tmpFont); } catch {}
  try { unlinkSync(assPath); } catch {}

  const stat = statSync(out);
  const outDur = getMediaDuration(out);
  console.log(`\nOutput: ${out}`);
  console.log(`Duration: ${outDur.toFixed(2)}s`);
  console.log(`Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
}

// ─── Main ───
checkFfmpeg();
const opts = parseArgs();

if (!opts.out) {
  console.error("Usage:");
  console.error("  Video: node scripts/assemble-tiktok.mjs --video raw.mp4 --audio narration.mp3 --overlays config.json --out out.mp4");
  console.error("  Stills: node scripts/assemble-tiktok.mjs --stills config.json --audio narration.mp3 --out out.mp4");
  process.exit(1);
}

if (opts.stills) {
  assembleStills(opts);
} else if (opts.video) {
  const overlayData = opts.overlays ? JSON.parse(readFileSync(opts.overlays, "utf8")) : [];
  assembleVideo({ ...opts, overlays: overlayData });
} else {
  console.error("Specify either --video or --stills mode.");
  process.exit(1);
}
