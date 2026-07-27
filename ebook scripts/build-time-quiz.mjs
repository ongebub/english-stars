// build-time-quiz.mjs — Insert 20 fill_blank quiz questions for Time & Daily Routines
// Run: node --env-file=.env.local "ebook scripts/build-time-quiz.mjs"
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const SUBJECT_ID = '1149568c-e72f-4f66-aa1b-acab72852055';
const VOICE_ID = 'C1npRmjB19a6yNkEucvx';

const QUIZ = [
  { prompt: 'You eat breakfast in the ___.', correct: 'morning', options: ['evening', 'nighttime', 'afternoon'], th: 'คุณกินอาหารเช้าตอน ___.' },
  { prompt: 'The sun is highest at ___.', correct: 'noon', options: ['midnight', 'morning', 'evening'], th: 'ดวงอาทิตย์อยู่สูงที่สุดตอน ___.' },
  { prompt: 'You eat lunch at ___.', correct: 'lunchtime', options: ['breakfast', 'bedtime', 'midnight'], th: 'คุณกินอาหารกลางวันตอน ___.' },
  { prompt: 'After school in the ___, Nong Fah walks home.', correct: 'afternoon', options: ['morning', 'nighttime', 'noon'], th: 'หลังเลิกเรียนตอน ___ น้องฟ้าเดินกลับบ้าน.' },
  { prompt: 'The sun sets in the ___.', correct: 'evening', options: ['morning', 'noon', 'afternoon'], th: 'ดวงอาทิตย์ตกตอน ___.' },
  { prompt: 'You sleep at ___.', correct: 'nighttime', options: ['noon', 'morning', 'lunchtime'], th: 'คุณนอนตอน ___.' },
  { prompt: 'The family eats dinner at ___.', correct: 'dinnertime', options: ['breakfast', 'lunchtime', 'recess'], th: 'ครอบครัวกินอาหารเย็นตอน ___.' },
  { prompt: 'On a clock, the SHORT hand shows the ___.', correct: 'hour', options: ['minute', 'second', 'day'], th: 'บนนาฬิกา เข็มสั้นบอก ___.' },
  { prompt: 'On a clock, the LONG hand shows the ___.', correct: 'minute', options: ['hour', 'week', 'month'], th: 'บนนาฬิกา เข็มยาวบอก ___.' },
  { prompt: 'When the long hand is on the 12, it is ___ o\'clock.', correct: 'exactly', options: ['half past', 'quarter to', 'almost'], th: 'เมื่อเข็มยาวชี้ที่เลข 12 จะเป็นเวลา ___ นาฬิกา.' },
  { prompt: 'When the long hand is on the 6, it is ___ past.', correct: 'half', options: ['quarter', 'ten', 'five'], th: 'เมื่อเข็มยาวชี้ที่เลข 6 จะเป็นเวลา ___ ผ่าน.' },
  { prompt: 'Nong Fah woke up at 6 o\'clock in the ___.', correct: 'morning', options: ['evening', 'afternoon', 'nighttime'], th: 'น้องฟ้าตื่นตอน 6 โมง ___.' },
  { prompt: 'School started at 8 o\'clock in the ___.', correct: 'morning', options: ['evening', 'nighttime', 'noon'], th: 'โรงเรียนเริ่มเวลา 8 โมง ___.' },
  { prompt: 'Twelve o\'clock in the middle of the day is called ___.', correct: 'noon', options: ['midnight', 'dawn', 'dusk'], th: 'สิบสองนาฬิกากลางวันเรียกว่า ___.' },
  { prompt: 'Nong Fah ate lunch, then it was 12:30 in the ___.', correct: 'afternoon', options: ['morning', 'nighttime', 'evening'], th: 'น้องฟ้ากินข้าวกลางวันแล้ว ตอนนั้นเป็นเวลา 12:30 ___.' },
  { prompt: 'School finished at 4 o\'clock in the ___.', correct: 'afternoon', options: ['morning', 'midnight', 'noon'], th: 'โรงเรียนเลิกเวลา 4 โมง ___.' },
  { prompt: 'Dinner started at 5:30 in the ___.', correct: 'evening', options: ['morning', 'noon', 'midnight'], th: 'อาหารเย็นเริ่มเวลา 5:30 ___.' },
  { prompt: 'Nong Fah went to bed at 8 o\'clock at ___.', correct: 'night', options: ['noon', 'dawn', 'lunchtime'], th: 'น้องฟ้าเข้านอนตอน 8 โมง ___.' },
  { prompt: 'First you eat breakfast, then ___, then dinner.', correct: 'lunch', options: ['bedtime', 'sunrise', 'recess'], th: 'ก่อนอื่นคุณกินอาหารเช้า แล้วก็ ___ แล้วก็อาหารเย็น.' },
  { prompt: 'The meal you eat last each day is ___.', correct: 'dinner', options: ['breakfast', 'lunch', 'brunch'], th: 'มื้ออาหารสุดท้ายที่คุณกินในแต่ละวันคือ ___.' },
];

async function genAudio(text, filename) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_KEY },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { error } = await sb.storage.from('audio').upload(filename, buf, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return `${SUPABASE_URL}/storage/v1/object/public/audio/${filename}`;
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

async function main() {
  // Delete any existing quiz questions for this subject
  await sb.from('quiz_questions').delete().eq('subject_id', SUBJECT_ID);

  console.log('\n=== Time & Daily Routines: 20 quiz questions ===\n');
  for (let i = 0; i < QUIZ.length; i++) {
    const q = QUIZ[i];
    const fn = `time-quiz-${i + 1}.mp3`;
    const spokenText = q.prompt.replace('___', 'blank');
    console.log(`  [${i + 1}/20] ${q.prompt.substring(0, 50)}...`);
    const url = await genAudio(spokenText, fn);
    const allOptions = [q.correct, ...q.options];
    const shuffled = shuffle(allOptions);
    const { error } = await sb.from('quiz_questions').insert({
      subject_id: SUBJECT_ID,
      question_type: 'fill_blank',
      prompt_en: q.prompt,
      prompt_th: q.th,
      audio_url: url,
      options: shuffled.map(o => ({ text: o, is_correct: o === q.correct })),
    });
    if (error) throw new Error(`Insert failed Q${i + 1}: ${error.message}`);
  }

  const { count } = await sb.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('subject_id', SUBJECT_ID);
  console.log(`\nDone! ${count} quiz questions inserted.`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
