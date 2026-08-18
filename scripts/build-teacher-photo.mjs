#!/usr/bin/env node
/**
 * build-teacher-photo.mjs
 *
 * Prepares the single photo for the /teacher landing page.
 *
 *   node scripts/build-teacher-photo.mjs
 *
 * WHY IMG_2184 AND NOT IMG_1905 — this was decided by measurement, not taste.
 *
 * The brief offered three photos and rated "legible handwritten English on a
 * whiteboard" as strong evidence, which pointed at IMG_1905 (Matt with a class,
 * homework and his name on the board behind). So that crop was rendered at the
 * TRUE size this page gives it — 375 CSS px wide — and inspected. At that size
 * the homework is illegible grey smudge, the handwriting is unreadable, and the
 * nine faces are about 15px tall each. The evidence that justified the photo is
 * invisible at the only size that matters, so it justifies nothing.
 *
 * IMG_2184 is Matt alone at a whiteboard: one unmistakable subject that still
 * reads as a teacher at thumbnail size, sharp, and it crops to 16:9 losing
 * nothing.
 *
 * IT ALSO REMOVES TWO CONSENT PROBLEMS RATHER THAN WAITING ON THEM.
 * IMG_1905's whiteboard shows Matt's full surname, which he had approved only as
 * a first name — and it shows EIGHT IDENTIFIABLE STUDENTS, whose appearance in
 * PAID ADVERTISING nobody had asked about at all. IMG_2184's whiteboard is
 * blank (verified at full resolution with contrast normalisation: erase-ghosting
 * only, no writing) and no one else is in frame. Nothing here needs anyone's
 * permission.
 *
 * If you ever switch this back to IMG_1905, both of those questions have to be
 * answered in writing first.
 */
import sharp from "sharp";
import { mkdirSync, existsSync, statSync } from "fs";

const SRC = "assets/marketing/raw/IMG_2184.JPG";
const OUT_DIR = "public/teacher";
const OUT = `${OUT_DIR}/matt-whiteboard.jpg`;

/** The page renders this in a 16:9 slot. */
const ASPECT = 16 / 9;
/** Vertical placement of the crop window, as a fraction of the spare height.
 *  0.35 keeps the whiteboard's top edge in frame while making Matt as large as
 *  possible. Lower values shrink him; higher values clip the board. */
const VERTICAL = 0.35;
/** 2x the ~375px slot, for retina. Bigger just ships bytes nobody can see. */
const WIDTH = 750;

if (!existsSync(SRC)) {
  console.error(`${SRC} not found.`);
  process.exit(1);
}
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// .rotate() with no argument applies the EXIF orientation. IMG_2184 is
// orientation 1 so this is a no-op today, but the other two candidates are 3
// and 6 — leave it in so swapping the source cannot silently produce a
// sideways or upside-down hero.
const src = sharp(SRC).rotate();
const meta = await src.metadata();

const cropW = meta.width;
const cropH = Math.round(cropW / ASPECT);
if (cropH > meta.height) {
  console.error(
    `Source is too short to crop 16:9 at full width (${meta.width}x${meta.height}).`
  );
  process.exit(1);
}
const top = Math.round((meta.height - cropH) * VERTICAL);

await sharp(SRC)
  .rotate()
  .extract({ left: 0, top, width: cropW, height: cropH })
  .resize(WIDTH)
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(OUT);

console.log(`${SRC}  ${meta.width}x${meta.height}`);
console.log(`  crop 16:9  ${cropW}x${cropH} at top=${top}`);
console.log(`  -> ${OUT}  ${WIDTH}x${Math.round(WIDTH / ASPECT)}  ${(statSync(OUT).size / 1024).toFixed(0)} KB`);
