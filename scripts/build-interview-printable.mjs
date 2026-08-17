/**
 * build-interview-printable.mjs
 *
 * Generates assets/printables/interview-20-questions.pdf — a 2-page A4 printable
 * of 20 school-interview practice questions for Thai parents.
 *
 * Run:  node scripts/build-interview-printable.mjs
 *
 * Design constraints (deliberate — do not "improve" these away):
 *   - Designed for HOME PRINTING. Black text on white. No large colour fills.
 *     Brand colours (sky #0288D1, leaf #388E3C) appear only as thin accents.
 *   - Exactly 2 pages, 10 questions per page. The script throws if that changes.
 *   - Thai is rendered with EMBEDDED Sarabun (assets/fonts/Sarabun-*.ttf) so that
 *     tone marks and vowels get real OpenType GPOS mark positioning. Never swap
 *     this for a non-Thai font.
 *   - Writing blanks are real ruled lines drawn with the graphics engine, never
 *     underscores in a text run.
 *
 * Everything below regenerates from the QUESTIONS array. Change the data, re-run.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FONT_REGULAR = path.join(ROOT, 'assets', 'fonts', 'Sarabun-Regular.ttf');
const FONT_BOLD = path.join(ROOT, 'assets', 'fonts', 'Sarabun-Bold.ttf');
const LOGO_PRIMARY = path.join(ROOT, 'public', 'logo-small.png');
const LOGO_FALLBACK = path.join(ROOT, 'public', 'logo.png');
const OUT_DIR = path.join(ROOT, 'assets', 'printables');
const OUT_FILE = path.join(OUT_DIR, 'interview-20-questions.pdf');

// ---------------------------------------------------------------- page geometry
const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 40;
const LEFT = MARGIN;
const RIGHT = A4_W - MARGIN; // 555.28
const CONTENT_W = RIGHT - LEFT;
const BOTTOM_LIMIT = A4_H - MARGIN; // 801.89 — nothing may be drawn below this

const NUM_COL = 22; // width reserved for "20."
const TEXT_X = LEFT + NUM_COL;

const BLOCK_H = 64; // per-question block pitch
const PER_PAGE = 10;

const P1_BLOCKS_TOP = 112;
const P2_BLOCKS_TOP = 68;

// ---------------------------------------------------------------------- palette
const INK = '#000000';
const GREY = '#455A64'; // Thai listen-for note
const RULE = '#90A4AE'; // writing lines
const BOX = '#78909C'; // checkbox borders
const FOOT = '#546E7A';
const SKY = '#0288D1';
const LEAF = '#388E3C';

// ------------------------------------------------------------------------- copy
const TITLE_TH = '20 คำถามฝึกสัมภาษณ์เข้าโรงเรียนหลักสูตรภาษาอังกฤษ';
const SUBHEAD_TH = 'ฝึกวันละ 2-3 ข้อ ติ๊กช่องทุกครั้งที่ลูกตอบได้';
const CONT_TH = 'ข้อ 11-20 (ต่อจากหน้าแรก)';
const FOOTER_TH_1 =
  'กรรมการไม่ได้มองหาเด็กที่พูดถูกทุกคำ แต่มองหาเด็กที่เข้าใจคำถามและกล้าตอบ';
const FOOTER_TH_2 = 'ฝึกวันละ 5 นาที ดีกว่าฝึกหนักวันเดียวก่อนสอบ';
const APP_LINE_TH =
  'ฝึกออกเสียงพร้อมเสียงเจ้าของภาษาได้ในแอป English Allstars — englishallstars.com';
const SITE = 'englishallstars.com';

// Questions 1-5 must stay first and in this order (they are the ones the ad promised).
const QUESTIONS = [
  { q: 'What is your name?', th: 'ฟังว่าเด็กบอกชื่อได้ชัดเจนไหม', starter: 'My name is' },
  { q: 'How old are you?', th: 'ฟังตัวเลขอายุ ไม่ต้องพูดเป็นประโยคยาว', starter: 'I am ___ years old' },
  { q: 'What is your favourite colour?', th: 'ฟังชื่อสีเป็นภาษาอังกฤษ', starter: 'My favourite colour is' },
  { q: 'Do you have any brothers or sisters?', th: 'ฟังคำว่า Yes หรือ No ก่อน แล้วค่อยบอกจำนวน', starter: "Yes, I have ___ / No, I don't" },
  { q: 'What do you like to do?', th: 'ฟังคำกริยาที่ตามหลัง I like to', starter: 'I like to' },
  { q: 'Where do you live?', th: 'ฟังชื่อจังหวัดหรือย่านที่อยู่', starter: 'I live in' },
  { q: 'What is your favourite food?', th: 'ฟังชื่ออาหาร จะเป็นอาหารไทยก็ได้', starter: 'My favourite food is' },
  { q: 'What is your favourite animal?', th: 'ฟังชื่อสัตว์เป็นภาษาอังกฤษ', starter: 'My favourite animal is' },
  { q: 'Do you have a pet?', th: 'ฟังว่าตอบ Yes หรือ No ตรงคำถามไหม', starter: "Yes, I have a ___ / No, I don't" },
  { q: 'What is your favourite subject?', th: 'ฟังชื่อวิชา เช่น English, Art, Maths', starter: 'My favourite subject is' },
  { q: 'How do you come to school?', th: 'ฟังคำว่า by car, by bus หรือ on foot', starter: 'I come by' },
  { q: 'Can you count to ten?', th: 'ฟังว่านับ 1 ถึง 10 ต่อเนื่องไม่สะดุด', starter: 'One, two, three ...' },
  { q: 'What colour is your shirt?', th: 'ให้เด็กมองเสื้อตัวเองแล้วตอบ', starter: 'My shirt is' },
  { q: 'Do you like school?', th: 'ฟังว่าตอบสั้น ๆ ได้ว่า Yes, I do', starter: "Yes, I do / No, I don't" },
  { q: 'Who is your best friend?', th: 'ฟังชื่อเพื่อน ให้พูดออกมาชัด ๆ', starter: 'My best friend is' },
  { q: 'What do you do after school?', th: 'ฟังกิจกรรมหลังเลิกเรียน', starter: 'After school I' },
  { q: 'What is your favourite toy?', th: 'ฟังชื่อของเล่นเป็นภาษาอังกฤษ', starter: 'My favourite toy is' },
  { q: 'How many people are in your family?', th: 'ฟังตัวเลขจำนวนคนในครอบครัว', starter: 'There are ___ people' },
  { q: 'What can you do?', th: 'ฟังคำว่า I can แล้วตามด้วยสิ่งที่ทำได้', starter: 'I can' },
  { q: 'Can you sing a song in English?', th: 'ฟังว่ากล้าร้องไหม ร้องถูกทุกคำไม่สำคัญ', starter: 'Yes, I can' },
];

// ------------------------------------------------------------------- preflight
function preflight() {
  const missing = [FONT_REGULAR, FONT_BOLD].filter((p) => !fs.existsSync(p));
  if (missing.length) {
    throw new Error(
      `Missing Thai font(s): ${missing.join(', ')}\n` +
        'Download Sarabun from https://github.com/google/fonts/tree/main/ofl/sarabun ' +
        'into assets/fonts/. Do NOT substitute a non-Thai font — tone marks will break.'
    );
  }
  if (QUESTIONS.length !== PER_PAGE * 2) {
    throw new Error(`Expected ${PER_PAGE * 2} questions, got ${QUESTIONS.length}`);
  }
  let logo = null;
  let logoScale = 1;
  if (fs.existsSync(LOGO_PRIMARY)) {
    logo = LOGO_PRIMARY;
  } else if (fs.existsSync(LOGO_FALLBACK)) {
    logo = LOGO_FALLBACK;
    logoScale = 1; // drawn at a fixed pt size below, so source resolution is irrelevant
  }
  return { logo, logoScale };
}

// ------------------------------------------------------------------- draw utils
/** Tracks the lowest y coordinate touched on each page, for the overflow report. */
const pageExtent = [];
/** Records any string that had to be auto-shrunk to fit its column. */
const shrinks = [];
function touch(pageIndex, y, label) {
  const e = pageExtent[pageIndex];
  if (!e || y > e.y) pageExtent[pageIndex] = { y, label };
}

/**
 * Single-line text at an exact position, never wrapping and never triggering a
 * page break. Shrinks the font a little if the string would overrun maxWidth
 * (Thai has no spaces, so a long note cannot be wrapped gracefully).
 */
function line(doc, str, x, y, opts = {}) {
  const { font = 'Sarabun', size = 10.5, color = INK, maxWidth = null, minSize = 7 } = opts;
  let s = size;
  doc.font(font).fontSize(s);
  if (maxWidth) {
    while (doc.widthOfString(str) > maxWidth && s > minSize) {
      s -= 0.25;
      doc.fontSize(s);
    }
    if (s < size) shrinks.push({ str, from: size, to: s, maxWidth });
  }
  doc.fillColor(color).text(str, x, y, { lineBreak: false });
  const w = doc.widthOfString(str);
  const h = doc.currentLineHeight();
  return { width: w, height: h, size: s, bottom: y + h };
}

function hRule(doc, x1, y, x2, color, width = 0.7) {
  doc.save().lineWidth(width).strokeColor(color).moveTo(x1, y).lineTo(x2, y).stroke().restore();
}

/**
 * Renders a sentence starter followed by a real ruled writing line.
 * Any '___' inside the starter data is replaced by an inline ruled blank,
 * so no underscores are ever typeset.
 */
function starterWithRule(doc, starter, x, y, rightEdge) {
  const SIZE = 10.5;
  const BLANK_W = 48;
  const ruleY = y + 12.5;
  doc.font('Sarabun').fontSize(SIZE).fillColor(INK);

  const segments = starter.split('___');
  let cursor = x;
  segments.forEach((seg, i) => {
    if (seg.length) {
      doc.text(seg, cursor, y, { lineBreak: false });
      cursor += doc.widthOfString(seg);
    }
    if (i < segments.length - 1) {
      hRule(doc, cursor + 2, ruleY, cursor + 2 + BLANK_W, RULE, 0.8);
      cursor += BLANK_W + 4;
    }
  });

  // Trailing writing line out to the right margin, if there is usable room.
  const trailStart = cursor + 6;
  if (rightEdge - trailStart >= 60) {
    hRule(doc, trailStart, ruleY, rightEdge, RULE, 0.8);
  }
  return ruleY;
}

function checkboxRow(doc, x, y, count = 5, size = 10, gap = 6) {
  doc.save().lineWidth(0.6).strokeColor(BOX);
  for (let i = 0; i < count; i++) {
    doc.rect(x + i * (size + gap), y, size, size).stroke();
  }
  doc.restore();
  return y + size;
}

function questionBlock(doc, pageIndex, item, number, top) {
  // 1. question, numbered
  doc.font('Sarabun-Bold').fontSize(12.5).fillColor(SKY);
  doc.text(`${number}.`, LEFT, top, { lineBreak: false });
  const qm = line(doc, item.q, TEXT_X, top, {
    font: 'Sarabun-Bold',
    size: 12.5,
    color: INK,
    maxWidth: RIGHT - TEXT_X,
  });
  touch(pageIndex, qm.bottom, `q${number} question`);

  // 2. Thai "what to listen for" note
  const nm = line(doc, item.th, TEXT_X, top + 17, {
    size: 9,
    color: GREY,
    maxWidth: RIGHT - TEXT_X,
  });
  touch(pageIndex, nm.bottom, `q${number} thai note`);

  // 3. sentence starter + real ruled writing line
  //    small leaf tick marks the line the child writes on
  doc.save().fillColor(LEAF).rect(LEFT + 6, top + 35, 3, 3).fill().restore();
  const ruleY = starterWithRule(doc, item.starter, TEXT_X, top + 31, RIGHT);
  touch(pageIndex, ruleY, `q${number} writing rule`);

  // 4. five practice checkboxes
  const boxBottom = checkboxRow(doc, TEXT_X, top + 48);
  touch(pageIndex, boxBottom, `q${number} checkboxes`);
}

function footer(doc, pageIndex, pageNo) {
  const y = 782;
  doc.font('Sarabun').fontSize(8).fillColor(FOOT);
  doc.text(SITE, LEFT, y, { lineBreak: false });
  const h = doc.currentLineHeight();
  doc.text(`${pageNo} / 2`, LEFT, y, { width: CONTENT_W, align: 'right', lineBreak: false });
  hRule(doc, LEFT, y - 6, RIGHT, '#CFD8DC', 0.5);
  touch(pageIndex, y + h, `page ${pageNo} footer`);
}

// ------------------------------------------------------------------------ build
function build() {
  const { logo } = preflight();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const doc = new PDFDocument({
    size: [A4_W, A4_H],
    margin: MARGIN,
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: '20 Interview Practice Questions — English Allstars',
      Author: 'English Allstars',
      Subject: 'School interview practice for Thai children',
      Creator: 'scripts/build-interview-printable.mjs',
    },
  });

  doc.registerFont('Sarabun', FONT_REGULAR);
  doc.registerFont('Sarabun-Bold', FONT_BOLD);

  const stream = fs.createWriteStream(OUT_FILE);
  doc.pipe(stream);

  // ---------------- page 1 header
  const LOGO_SIZE = 46;
  if (logo) {
    doc.image(logo, RIGHT - LOGO_SIZE, MARGIN - 6, { width: LOGO_SIZE, height: LOGO_SIZE });
  }
  const titleMetrics = line(doc, TITLE_TH, LEFT, MARGIN, {
    font: 'Sarabun-Bold',
    size: 16,
    color: INK,
    maxWidth: CONTENT_W - LOGO_SIZE - 12,
  });
  touch(0, titleMetrics.bottom, 'title');
  const subMetrics = line(doc, SUBHEAD_TH, LEFT, MARGIN + 24, {
    size: 10.5,
    color: GREY,
    maxWidth: CONTENT_W - LOGO_SIZE - 12,
  });
  touch(0, subMetrics.bottom, 'subhead');
  hRule(doc, LEFT, MARGIN + 50, RIGHT, SKY, 1.2);
  touch(0, MARGIN + 50, 'header rule');

  for (let i = 0; i < PER_PAGE; i++) {
    questionBlock(doc, 0, QUESTIONS[i], i + 1, P1_BLOCKS_TOP + i * BLOCK_H);
  }
  footer(doc, 0, 1);

  // ---------------- page 2
  doc.addPage({ size: [A4_W, A4_H], margin: MARGIN });
  const contMetrics = line(doc, CONT_TH, LEFT, MARGIN, { size: 9.5, color: GREY });
  touch(1, contMetrics.bottom, 'continuation label');
  hRule(doc, LEFT, MARGIN + 16, RIGHT, SKY, 1.2);
  touch(1, MARGIN + 16, 'page 2 rule');

  for (let i = 0; i < PER_PAGE; i++) {
    const idx = PER_PAGE + i;
    questionBlock(doc, 1, QUESTIONS[idx], idx + 1, P2_BLOCKS_TOP + i * BLOCK_H);
  }

  // ---------------- closing note (page 2)
  const noteTop = 716;
  hRule(doc, LEFT, noteTop, RIGHT, LEAF, 1);
  touch(1, noteTop, 'note rule');
  const n1 = line(doc, FOOTER_TH_1, LEFT, noteTop + 8, { size: 9.5, color: INK, maxWidth: CONTENT_W });
  touch(1, n1.bottom, 'footer note line 1');
  const n2 = line(doc, FOOTER_TH_2, LEFT, noteTop + 24, { size: 9.5, color: INK, maxWidth: CONTENT_W });
  touch(1, n2.bottom, 'footer note line 2');
  const n3 = line(doc, APP_LINE_TH, LEFT, noteTop + 42, { size: 8.5, color: FOOT, maxWidth: CONTENT_W });
  touch(1, n3.bottom, 'app line');

  footer(doc, 1, 2);

  const range = doc.bufferedPageRange();
  if (range.count !== 2) {
    throw new Error(`Expected exactly 2 pages, generated ${range.count}. Layout overflowed.`);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', () => resolve(range.count));
  });
}

// ----------------------------------------------------------------------- report
const pageCount = await build();
const bytes = fs.statSync(OUT_FILE).size;

console.log('Wrote  :', path.relative(ROOT, OUT_FILE).replace(/\\/g, '/'));
console.log('Pages  :', pageCount);
console.log('Bytes  :', bytes);
console.log('Fonts  : Sarabun-Regular.ttf, Sarabun-Bold.ttf (embedded subsets)');
console.log('Page   : A4 %s x %s pt, margin %s pt, bottom limit %s pt', A4_W, A4_H, MARGIN, BOTTOM_LIMIT);
if (shrinks.length === 0) {
  console.log('Fit    : no string needed auto-shrinking');
} else {
  console.log('Fit    : %d string(s) auto-shrunk to fit their column:', shrinks.length);
  shrinks.forEach((s) =>
    console.log(`         ${s.from}pt -> ${s.to}pt (max ${s.maxWidth.toFixed(1)}pt) "${s.str}"`)
  );
}
pageExtent.forEach((e, i) => {
  const ok = e.y <= BOTTOM_LIMIT;
  console.log(
    `Page ${i + 1}: lowest element "${e.label}" bottom y = ${e.y.toFixed(2)} pt  ` +
      `(${(BOTTOM_LIMIT - e.y).toFixed(2)} pt clear of bottom margin) ${ok ? 'OK' : 'OVERFLOW'}`
  );
  if (!ok) throw new Error(`Page ${i + 1} overflows the bottom margin.`);
});
