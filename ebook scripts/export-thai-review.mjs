// export-thai-review.mjs — Export all machine-generated Thai strings for Matt's review
// Run: node --env-file=.env.local "ebook scripts/export-thai-review.mjs"
// Output: ./matt-review/thai-review.csv (UTF-8 with BOM for Excel)

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(fields) {
  return fields.map(csvEscape).join(',');
}

async function main() {
  const rows = [];
  const counts = {};

  function add(source_table, row_id, subject, english, thai) {
    rows.push({ source_table, row_id, subject, english, thai });
    counts[source_table] = (counts[source_table] || 0) + 1;
  }

  // 1. Subjects
  const { data: subjects } = await sb.from('subjects').select('id, title_en, title_th').order('sort_order');
  const subjectMap = {};
  for (const s of subjects) {
    subjectMap[s.id] = s.title_en;
    if (s.title_th) add('subjects', s.id, s.title_en, s.title_en, s.title_th);
  }

  // 2. Flashcards: word_en/word_th + example_en/example_th
  const { data: flashcards } = await sb.from('flashcards')
    .select('id, subject_id, word_en, word_th, example_en, example_th')
    .order('subject_id').order('sort_order');
  for (const fc of flashcards) {
    const subj = subjectMap[fc.subject_id] || 'Unknown';
    if (fc.word_th) add('flashcards', fc.id, subj, fc.word_en, fc.word_th);
    if (fc.example_en && fc.example_th) add('flashcards_example', fc.id, subj, fc.example_en, fc.example_th);
  }

  // 3. Quiz questions
  let allQuiz = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('quiz_questions')
      .select('id, subject_id, prompt_en, prompt_th')
      .order('subject_id').order('id')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allQuiz = allQuiz.concat(data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  for (const q of allQuiz) {
    const subj = subjectMap[q.subject_id] || 'Unknown';
    if (q.prompt_th) add('quiz_questions', q.id, subj, q.prompt_en, q.prompt_th);
  }

  // 4. Picture quiz questions
  const { data: picq } = await sb.from('picture_quiz_questions')
    .select('id, subject_id, question_en, question_th')
    .order('subject_id');
  for (const q of (picq || [])) {
    const subj = subjectMap[q.subject_id] || 'Unknown';
    if (q.question_th) add('picture_quiz_questions', q.id, subj, q.question_en, q.question_th);
  }

  // 5. Reader books
  const { data: rbooks } = await sb.from('reader_books')
    .select('id, title_en, title_th')
    .order('sort_order');
  for (const b of (rbooks || [])) {
    if (b.title_th) add('reader_books', b.id, b.title_en, b.title_en, b.title_th);
  }

  // Build CSV with BOM
  const header = csvRow(['source_table', 'row_id', 'subject', 'english', 'thai', 'matt_status', 'matt_correction']);
  const csvLines = [header, ...rows.map(r => csvRow([r.source_table, r.row_id, r.subject, r.english, r.thai, '', '']))];
  const bom = '\uFEFF';
  writeFileSync('./matt-review/thai-review.csv', bom + csvLines.join('\n'), 'utf8');

  // Report
  console.log('\n=== Thai Review Export ===');
  for (const [table, count] of Object.entries(counts).sort()) {
    console.log(`  ${table}: ${count} rows`);
  }
  console.log(`  TOTAL: ${rows.length} rows`);
  console.log(`\nWritten to ./matt-review/thai-review.csv`);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
