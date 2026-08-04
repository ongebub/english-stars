#!/usr/bin/env node
// overlays-from-timestamps.mjs — Generate overlay JSON from ElevenLabs word timestamps
// Usage: node scripts/overlays-from-timestamps.mjs --timestamps timestamps.json --mapping mapping.json --out overlays.json
//
// timestamps.json: ElevenLabs /with-timestamps response (alignment object)
// mapping.json: array of overlay lines, each with the words that trigger it:
//   [
//     { "text": "สอนลูกเรียนสีภาษาอังกฤษ", "style": "thai", "words": ["*"] },
//     { "text": "Red", "style": "english", "words": ["Red"] },
//     { "text": "Blue", "style": "english", "words": ["Blue"] }
//   ]
//   "words": ["*"] means the overlay persists for the entire clip.
//   Otherwise, startSec = when the first matching word starts speaking,
//   endSec = when the last matching word finishes or next overlay starts.
//
// Minimum on-screen duration: 1.2s per line.
// If a line ends before the next begins, it is held until the next starts.

import { readFileSync, writeFileSync } from "fs";

const MIN_DURATION = 1.2;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--timestamps") opts.timestamps = args[++i];
    if (args[i] === "--mapping")    opts.mapping = args[++i];
    if (args[i] === "--out")        opts.out = args[++i];
    if (args[i] === "--duration")   opts.duration = parseFloat(args[++i]);
  }
  return opts;
}

function buildWordTimings(alignment) {
  const chars = alignment.characters || [];
  const starts = alignment.character_start_times_seconds || [];
  const ends = alignment.character_end_times_seconds || [];

  return chars.reduce((acc, ch, i) => {
    if (ch === " " || ch === "\n") return acc;
    const prev = i > 0 ? chars[i - 1] : null;
    const lastWord = acc[acc.length - 1];
    if (lastWord && prev !== " " && prev !== "\n" && i > 0) {
      lastWord.word += ch;
      lastWord.end = ends[i];
    } else {
      acc.push({ word: ch, start: starts[i], end: ends[i] });
    }
    return acc;
  }, []);
}

const opts = parseArgs();

if (!opts.timestamps || !opts.mapping || !opts.out) {
  console.error("Usage: node scripts/overlays-from-timestamps.mjs --timestamps ts.json --mapping map.json --out out.json [--duration 15]");
  process.exit(1);
}

const tsData = JSON.parse(readFileSync(opts.timestamps, "utf8"));
const alignment = tsData.alignment || tsData;
const wordTimings = buildWordTimings(alignment);
const mapping = JSON.parse(readFileSync(opts.mapping, "utf8"));

const totalDuration = opts.duration || (wordTimings.length > 0 ? wordTimings[wordTimings.length - 1].end + 1 : 10);

const overlays = [];

for (const line of mapping) {
  if (line.words[0] === "*") {
    // Persistent overlay: entire clip
    overlays.push({
      text: line.text,
      startSec: 0,
      endSec: totalDuration,
      style: line.style || "thai",
    });
    continue;
  }

  // Find the first and last matching word in the timing data
  let firstStart = null;
  let lastEnd = null;

  for (const targetWord of line.words) {
    const lowerTarget = targetWord.toLowerCase().replace(/[^a-z]/g, "");
    for (const wt of wordTimings) {
      const lowerWord = wt.word.toLowerCase().replace(/[^a-z]/g, "");
      if (lowerWord === lowerTarget) {
        if (firstStart === null || wt.start < firstStart) firstStart = wt.start;
        if (lastEnd === null || wt.end > lastEnd) lastEnd = wt.end;
      }
    }
  }

  if (firstStart === null) {
    console.warn(`Warning: no timing match for words [${line.words.join(", ")}] in "${line.text}"`);
    continue;
  }

  overlays.push({
    text: line.text,
    startSec: Math.max(0, firstStart - 0.1), // slight lead-in
    endSec: lastEnd,
    style: line.style || "thai",
  });
}

// Post-process: enforce minimum duration and hold-until-next
for (let i = 0; i < overlays.length; i++) {
  const ov = overlays[i];
  const duration = ov.endSec - ov.startSec;
  if (duration < MIN_DURATION) {
    ov.endSec = ov.startSec + MIN_DURATION;
  }

  // Hold until next overlay of the same style starts (no blank screen)
  if (i < overlays.length - 1) {
    const next = overlays.slice(i + 1).find((n) => n.style === ov.style);
    if (next && ov.endSec < next.startSec) {
      ov.endSec = next.startSec;
    }
  }
}

writeFileSync(opts.out, JSON.stringify(overlays, null, 2));
console.log(`Generated ${overlays.length} overlays → ${opts.out}`);
for (const ov of overlays) {
  console.log(`  [${ov.startSec.toFixed(2)}-${ov.endSec.toFixed(2)}] (${ov.style}) ${ov.text}`);
}
