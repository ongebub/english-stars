// import-thai-corrections.mjs — Apply Matt's Thai corrections from the review CSV
// Run: node --env-file=.env.local "ebook scripts/import-thai-corrections.mjs"          (dry run)
//      node --env-file=.env.local "ebook scripts/import-thai-corrections.mjs" --apply  (live)
//
// Reads ./matt-review/thai-review.csv, finds rows where matt_correction is non-empty,
// and updates the corresponding table/row/column. Idempotent.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const lines = text.split(/\r?\n/);
  // Skip BOM + header
  const start = lines[0].startsWith('\uFEFF') ? 0 : 0;
  const header = parseCSVLine(lines[start].replace(/^\uFEFF/, ''));
  for (let li = start + 1; li < lines.length; li++) {
    if (!lines[li].trim()) continue;
    const fields = parseCSVLine(lines[li]);
    const row = {};
    header.forEach((h, i) => { row[h] = fields[i] || ''; });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i >= line.length) { fields.push(''); break; }
    if (line[i] === '"') {
      let val = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { val += line[i]; i++; }
      }
      if (line[i] === ',') i++;
      fields.push(val);
    } else {
      const next = line.indexOf(',', i);
      if (next === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, next));
      i = next + 1;
    }
  }
  return fields;
}

// Map source_table to { table, thaiColumn }
const TABLE_MAP = {
  subjects: { table: 'subjects', col: 'title_th' },
  flashcards: { table: 'flashcards', col: 'word_th' },
  flashcards_example: { table: 'flashcards', col: 'example_th' },
  quiz_questions: { table: 'quiz_questions', col: 'prompt_th' },
  picture_quiz_questions: { table: 'picture_quiz_questions', col: 'question_th' },
  reader_books: { table: 'reader_books', col: 'title_th' },
};

async function main() {
  console.log(`\n=== Thai Corrections Import (${APPLY ? 'LIVE' : 'DRY RUN'}) ===\n`);

  const text = readFileSync('./matt-review/thai-review.csv', 'utf8');
  const rows = parseCSV(text);
  console.log(`Loaded ${rows.length} rows from CSV`);

  const corrections = rows.filter(r => r.matt_correction && r.matt_correction.trim());
  console.log(`Found ${corrections.length} corrections\n`);

  if (corrections.length === 0) {
    console.log('Nothing to apply.');
    return;
  }

  let applied = 0, skipped = 0;
  for (const row of corrections) {
    const mapping = TABLE_MAP[row.source_table];
    if (!mapping) {
      console.log(`  SKIP unknown table: ${row.source_table}`);
      skipped++;
      continue;
    }

    const oldVal = row.thai;
    const newVal = row.matt_correction.trim();
    if (oldVal === newVal) {
      console.log(`  SKIP ${row.source_table}/${row.row_id}: correction same as original`);
      skipped++;
      continue;
    }

    console.log(`  ${mapping.table}.${mapping.col} [${row.row_id}]:`);
    console.log(`    OLD: ${oldVal}`);
    console.log(`    NEW: ${newVal}`);

    if (APPLY) {
      const { error } = await sb.from(mapping.table)
        .update({ [mapping.col]: newVal })
        .eq('id', row.row_id);
      if (error) {
        console.log(`    ERROR: ${error.message}`);
        skipped++;
      } else {
        console.log(`    APPLIED`);
        applied++;
      }
    } else {
      console.log(`    (dry run — would apply)`);
      applied++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${applied}, Skipped: ${skipped}`);
  if (!APPLY && applied > 0) {
    console.log('\nRe-run with --apply to apply these corrections.');
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
