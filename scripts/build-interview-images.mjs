#!/usr/bin/env node
/**
 * build-interview-images.mjs
 *
 * Prepares the five ad stills for the /interview landing page.
 *
 *   node scripts/build-interview-images.mjs
 *
 * These are the SAME images as the ad video creative, deliberately: the visitor
 * arrives having just watched them, and seeing them again is what makes the
 * page feel like the ad rather than a different site.
 *
 * Source is assets/marketing/raw/, which is gitignored, so the web-ready output
 * lands in public/interview/ and IS committed.
 *
 * CROP — read before changing it.
 * The sources are 768x1376 (9:16) because they were generated for vertical
 * video. The task spec assumed the character sits in the upper two thirds with
 * empty space below; that is NOT true — the figures run nearly full height with
 * shoes at about 78%. A top-anchored SQUARE crop was checked frame by frame and
 * keeps everything that carries meaning: both hands in "how old are you", the
 * crayons in "favourite colour", the younger brother, the drawing. It loses only
 * shoes and floor. Do not deepen the crop past 768 without looking at the
 * crayons in interview-03, which sit right above the cut line.
 *
 * Output is JPEG, not WebP. next/image transcodes to WebP/AVIF per the browser's
 * Accept header and falls back to the SOURCE format, so a WebP source would
 * simply break on a browser that cannot read WebP. JPEG is the safe original.
 */
import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync, statSync } from "fs";

const RAW = "assets/marketing/raw";
const OUT = "public/interview";

const CROP = { left: 0, top: 0, width: 768, height: 768 };
const DISPLAY_WIDTH = 640; // cards render at ~320 CSS px; 2x for retina

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const sources = readdirSync(RAW)
  .filter((f) => /^interview-0\d.*\.png$/i.test(f))
  .sort();

if (sources.length !== 5) {
  console.error(`Expected 5 interview stills in ${RAW}, found ${sources.length}. Stopping.`);
  process.exit(1);
}

let total = 0;
for (const file of sources) {
  // At least one source has a double extension (interview-01.png.png).
  const n = file.match(/^interview-(0\d)/)[1];
  const dest = `${OUT}/interview-${n}.jpg`;

  const meta = await sharp(`${RAW}/${file}`).metadata();
  if (meta.width !== 768 || meta.height !== 1376) {
    console.error(
      `${file} is ${meta.width}x${meta.height}, expected 768x1376. ` +
        `The hardcoded crop assumes the original geometry. Stopping.`
    );
    process.exit(1);
  }

  await sharp(`${RAW}/${file}`)
    .extract(CROP)
    .resize(DISPLAY_WIDTH, DISPLAY_WIDTH)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(dest);

  const kb = statSync(dest).size / 1024;
  total += kb;
  console.log(`  ${file} -> ${dest}  ${DISPLAY_WIDTH}x${DISPLAY_WIDTH}  ${kb.toFixed(0)} KB`);
}

console.log(`\n5 images, ${total.toFixed(0)} KB total.`);
