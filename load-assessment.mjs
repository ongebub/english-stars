#!/usr/bin/env node
/**
 * load-assessment.mjs
 *
 * Reads a JSON file containing assessment data and inserts it into the
 * assessment_* tables in Supabase.
 *
 * Usage:
 *   node load-assessment.mjs path/to/assessment.json
 *
 * Expected JSON shape:
 * {
 *   "kind": "final_test" | "practice_quiz",
 *   "title_en": "Paper 1 – Grade K",
 *   "title_th": "...",
 *   "paper_number": 1,
 *   "section": "expression" | "reading" | "structure" | "vocabulary" | null,
 *   "grade_band": "K" | "1" | "2" | "3",
 *   "total_points": 40,
 *   "time_limit_minutes": 60,
 *   "is_published": false,
 *   "passages": [                         // optional
 *     { "sort_order": 1, "title_en": "...", "body_en": "...", "audio_url": null }
 *   ],
 *   "questions": [
 *     {
 *       "item_number": 1,
 *       "part": "expression",
 *       "points": 1,
 *       "situation_en": "...",
 *       "dialogue_en": "...",
 *       "prompt_en": "...",
 *       "prompt_th": "...",
 *       "audio_url": null,
 *       "answer_type": "multiple_choice",
 *       "tests_note": null,
 *       "source_subject": null,
 *       "is_inference": false,
 *       "passage_sort_order": null,        // links to passage by sort_order
 *       "options": [
 *         { "text_en": "correct answer" },  // option index 0 is ALWAYS the correct answer in source data
 *         { "text_en": "wrong 1" },
 *         { "text_en": "wrong 2" },
 *         { "text_en": "wrong 3" }
 *       ]
 *     }
 *   ]
 * }
 *
 * SHUFFLE STEP (important):
 * The source JSON always has the correct answer as the FIRST option (index 0).
 * Before inserting, this script shuffles the options using Fisher-Yates so that
 * the correct answer appears at a random option_number (1-based) each time.
 * The is_correct flag is assigned AFTER shuffling based on which element was
 * originally at index 0.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from project root
config({ path: resolve(import.meta.dirname, ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle (in-place, returns the same array)
// ---------------------------------------------------------------------------
function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: node load-assessment.mjs <path-to-json>");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));

  // 1. Insert the assessment row
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .insert({
      kind: data.kind,
      title_en: data.title_en,
      title_th: data.title_th ?? null,
      paper_number: data.paper_number ?? null,
      section: data.section ?? null,
      grade_band: data.grade_band ?? null,
      total_points: data.total_points ?? null,
      time_limit_minutes: data.time_limit_minutes ?? null,
      is_published: data.is_published ?? false,
    })
    .select("id")
    .single();

  if (aErr) {
    console.error("Failed to insert assessment:", aErr.message);
    process.exit(1);
  }
  const assessmentId = assessment.id;
  console.log(`Created assessment ${assessmentId}: ${data.title_en}`);

  // 2. Insert passages (if any) and build a sort_order -> id lookup
  const passageMap = new Map(); // sort_order -> uuid
  if (data.passages && data.passages.length > 0) {
    const passageRows = data.passages.map((p) => ({
      assessment_id: assessmentId,
      sort_order: p.sort_order,
      title_en: p.title_en ?? null,
      body_en: p.body_en,
      audio_url: p.audio_url ?? null,
    }));

    const { data: passages, error: pErr } = await supabase
      .from("assessment_passages")
      .insert(passageRows)
      .select("id, sort_order");

    if (pErr) {
      console.error("Failed to insert passages:", pErr.message);
      process.exit(1);
    }
    for (const p of passages) {
      passageMap.set(p.sort_order, p.id);
    }
    console.log(`  Inserted ${passages.length} passage(s)`);
  }

  // 3. Insert questions one-by-one (need each id for options)
  let totalOptions = 0;
  for (const q of data.questions) {
    const passageId = q.passage_sort_order != null
      ? passageMap.get(q.passage_sort_order) ?? null
      : null;

    const { data: question, error: qErr } = await supabase
      .from("assessment_questions")
      .insert({
        assessment_id: assessmentId,
        passage_id: passageId,
        item_number: q.item_number,
        part: q.part,
        points: q.points,
        situation_en: q.situation_en ?? null,
        dialogue_en: q.dialogue_en ?? null,
        prompt_en: q.prompt_en ?? null,
        prompt_th: q.prompt_th ?? null,
        audio_url: q.audio_url ?? null,
        answer_type: q.answer_type ?? "multiple_choice",
        tests_note: q.tests_note ?? null,
        source_subject: q.source_subject ?? null,
        is_inference: q.is_inference ?? false,
      })
      .select("id")
      .single();

    if (qErr) {
      console.error(`Failed to insert question ${q.item_number}:`, qErr.message);
      process.exit(1);
    }

    // -----------------------------------------------------------------------
    // SHUFFLE OPTIONS
    //
    // Source data convention: options[0] is ALWAYS the correct answer.
    // We tag each option with its original index, shuffle with Fisher-Yates,
    // then assign option_number (1-based) and is_correct based on original index.
    // -----------------------------------------------------------------------
    const tagged = q.options.map((opt, idx) => ({ ...opt, _origIdx: idx }));
    fisherYatesShuffle(tagged);

    const optionRows = tagged.map((opt, shuffledIdx) => ({
      question_id: question.id,
      option_number: shuffledIdx + 1,           // 1-based after shuffle
      text_en: opt.text_en,
      is_correct: opt._origIdx === 0,           // original index 0 = correct
    }));

    const { error: oErr } = await supabase
      .from("assessment_options")
      .insert(optionRows);

    if (oErr) {
      console.error(`Failed to insert options for question ${q.item_number}:`, oErr.message);
      process.exit(1);
    }
    totalOptions += optionRows.length;
  }

  console.log(`  Inserted ${data.questions.length} question(s) with ${totalOptions} option(s)`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
