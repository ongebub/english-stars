-- ============================================================
--  002_seed.sql  –  Seed data for English Stars
-- ============================================================

-- ── Module 1 subjects (sort_order 1-18) ─────────────────────

INSERT INTO subjects (module, slug, title_en, title_th, emoji, sort_order, is_published)
VALUES
  (1, 'abcs',                'ABCs',                    'ตัวอักษร ABC',              '🔤', 1,  true),
  (1, 'phonics-sounds',      'Phonics Sounds',          'เสียงโฟนิกส์',              '🔊', 2,  true),
  (1, 'numbers-counting',    'Numbers & Counting',      'ตัวเลขและการนับ',            '🔢', 3,  true),
  (1, 'colors',              'Colors',                  'สี',                        '🎨', 4,  true),
  (1, 'shapes',              'Shapes',                  'รูปทรง',                    '🔷', 5,  true),
  (1, 'animals',             'Animals',                 'สัตว์',                     '🐾', 6,  true),
  (1, 'plants',              'Plants',                  'พืช',                       '🌱', 7,  true),
  (1, 'food-drink',          'Food & Drink',            'อาหารและเครื่องดื่ม',         '🍎', 8,  true),
  (1, 'body-parts',          'Body Parts',              'อวัยวะร่างกาย',              '🫁', 9,  true),
  (1, 'five-senses',         'Five Senses',             'ประสาทสัมผัสทั้งห้า',         '👁️', 10, true),
  (1, 'feelings-emotions',   'Feelings & Emotions',     'ความรู้สึกและอารมณ์',         '😊', 11, true),
  (1, 'jobs-careers',        'Jobs & Careers',          'อาชีพ',                     '👨‍⚕️', 12, true),
  (1, 'vehicles',            'Vehicles',                'ยานพาหนะ',                  '🚗', 13, true),
  (1, 'buildings',           'Buildings',               'อาคาร',                     '🏢', 14, true),
  (1, 'around-the-house',    'Around the House',        'รอบบ้าน',                   '🏠', 15, true),
  (1, 'at-school',           'At School',               'ที่โรงเรียน',                '🏫', 16, true),
  (1, 'practice-tests',      'Full Practice Tests',     'แบบทดสอบ',                  '📝', 17, true),
  (1, 'interview-practice',  'Interview Practice',      'ฝึกสัมภาษณ์',               '🎤', 18, true);

-- ── Module 2 subjects (sort_order 1-10) ─────────────────────

INSERT INTO subjects (module, slug, title_en, title_th, emoji, sort_order, is_published)
VALUES
  (2, 'phonics-blending',    'Phonics Blending',        'การผสมเสียง',               '🔡', 1,  true),
  (2, 'prepositions',        'Prepositions',            'คำบุพบท',                   '📍', 2,  true),
  (2, 'common-verbs',        'Common Verbs',            'คำกริยาทั่วไป',              '🏃', 3,  true),
  (2, 'hobbies',             'Hobbies',                 'งานอดิเรก',                 '⚽', 4,  true),
  (2, 'rhyming-words',       'Rhyming Words',           'คำคล้องจอง',                '🎵', 5,  true),
  (2, 'comparisons',         'Comparisons',             'การเปรียบเทียบ',             '⚖️', 6,  true),
  (2, 'adjectives',          'Adjectives',              'คำคุณศัพท์',                 '✨', 7,  true),
  (2, 'subject-verb',        'Subject & Verb',          'ประธานและกริยา',              '📖', 8,  true),
  (2, 'tenses',              'Past/Present/Future Tense','กาล',                      '⏰', 9,  true),
  (2, 'read-along-stories',  'Read-Along Stories',      'อ่านนิทาน',                 '📚', 10, true);


-- ── Flashcards: Colors (5 cards) ────────────────────────────

INSERT INTO flashcards (subject_id, word_en, word_th, image_url, audio_url, sort_order)
VALUES
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'Red',    'แดง',     NULL, NULL, 1),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'Blue',   'น้ำเงิน',  NULL, NULL, 2),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'Green',  'เขียว',   NULL, NULL, 3),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'Yellow', 'เหลือง',  NULL, NULL, 4),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'Orange', 'ส้ม',     NULL, NULL, 5);


-- ── Flashcards: Animals (5 cards) ───────────────────────────

INSERT INTO flashcards (subject_id, word_en, word_th, image_url, audio_url, sort_order)
VALUES
  ((SELECT id FROM subjects WHERE slug = 'animals'), 'Dog',      'สุนัข', NULL, NULL, 1),
  ((SELECT id FROM subjects WHERE slug = 'animals'), 'Cat',      'แมว',   NULL, NULL, 2),
  ((SELECT id FROM subjects WHERE slug = 'animals'), 'Bird',     'นก',    NULL, NULL, 3),
  ((SELECT id FROM subjects WHERE slug = 'animals'), 'Fish',     'ปลา',   NULL, NULL, 4),
  ((SELECT id FROM subjects WHERE slug = 'animals'), 'Elephant', 'ช้าง',  NULL, NULL, 5);


-- ── Ebook: Colors (5 pages) ────────────────────────────────

INSERT INTO ebook_pages (subject_id, page_number, text_en, image_url, audio_url)
VALUES
  ((SELECT id FROM subjects WHERE slug = 'colors'), 1,
   'This is the color red. Apples are red. Fire trucks are red.',
   NULL, NULL),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 2,
   'This is the color blue. The sky is blue. The ocean is blue.',
   NULL, NULL),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 3,
   'This is the color green. Grass is green. Frogs are green.',
   NULL, NULL),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 4,
   'This is the color yellow. Bananas are yellow. The sun is yellow.',
   NULL, NULL),
  ((SELECT id FROM subjects WHERE slug = 'colors'), 5,
   'This is the color orange. Oranges are orange. Carrots are orange.',
   NULL, NULL);


-- ── Quiz questions: Colors — word_to_letter (5) ────────────

INSERT INTO quiz_questions (subject_id, question_type, prompt_en, prompt_th, image_url, audio_url, options)
VALUES
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_letter',
   'What letter does RED start with?', 'RED เริ่มต้นด้วยตัวอักษรอะไร?', NULL, NULL,
   '[{"text":"R","is_correct":true},{"text":"B","is_correct":false},{"text":"G","is_correct":false},{"text":"Y","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_letter',
   'What letter does BLUE start with?', 'BLUE เริ่มต้นด้วยตัวอักษรอะไร?', NULL, NULL,
   '[{"text":"B","is_correct":true},{"text":"R","is_correct":false},{"text":"O","is_correct":false},{"text":"G","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_letter',
   'What letter does GREEN start with?', 'GREEN เริ่มต้นด้วยตัวอักษรอะไร?', NULL, NULL,
   '[{"text":"G","is_correct":true},{"text":"Y","is_correct":false},{"text":"R","is_correct":false},{"text":"B","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_letter',
   'What letter does YELLOW start with?', 'YELLOW เริ่มต้นด้วยตัวอักษรอะไร?', NULL, NULL,
   '[{"text":"Y","is_correct":true},{"text":"G","is_correct":false},{"text":"B","is_correct":false},{"text":"R","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_letter',
   'What letter does ORANGE start with?', 'ORANGE เริ่มต้นด้วยตัวอักษรอะไร?', NULL, NULL,
   '[{"text":"O","is_correct":true},{"text":"R","is_correct":false},{"text":"G","is_correct":false},{"text":"B","is_correct":false}]'::jsonb);


-- ── Quiz questions: Colors — fill_blank (5) ─────────────────

INSERT INTO quiz_questions (subject_id, question_type, prompt_en, prompt_th, image_url, audio_url, options)
VALUES
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'fill_blank',
   'The sky is ___.', 'ท้องฟ้าเป็นสี___', NULL, NULL,
   '[{"text":"blue","is_correct":true},{"text":"red","is_correct":false},{"text":"green","is_correct":false},{"text":"yellow","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'fill_blank',
   'Apples are ___.', 'แอปเปิ้ลเป็นสี___', NULL, NULL,
   '[{"text":"red","is_correct":true},{"text":"blue","is_correct":false},{"text":"orange","is_correct":false},{"text":"green","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'fill_blank',
   'Grass is ___.', 'หญ้าเป็นสี___', NULL, NULL,
   '[{"text":"green","is_correct":true},{"text":"yellow","is_correct":false},{"text":"red","is_correct":false},{"text":"blue","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'fill_blank',
   'Bananas are ___.', 'กล้วยเป็นสี___', NULL, NULL,
   '[{"text":"yellow","is_correct":true},{"text":"green","is_correct":false},{"text":"red","is_correct":false},{"text":"orange","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'fill_blank',
   'Carrots are ___.', 'แครอทเป็นสี___', NULL, NULL,
   '[{"text":"orange","is_correct":true},{"text":"yellow","is_correct":false},{"text":"blue","is_correct":false},{"text":"red","is_correct":false}]'::jsonb);


-- ── Quiz questions: Colors — word_to_picture (5) ────────────

INSERT INTO quiz_questions (subject_id, question_type, prompt_en, prompt_th, image_url, audio_url, options)
VALUES
  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_picture',
   'Which color is RED?', 'สีไหนคือ RED?', NULL, NULL,
   '[{"text":"Red","is_correct":true},{"text":"Blue","is_correct":false},{"text":"Green","is_correct":false},{"text":"Yellow","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_picture',
   'Which color is BLUE?', 'สีไหนคือ BLUE?', NULL, NULL,
   '[{"text":"Blue","is_correct":true},{"text":"Red","is_correct":false},{"text":"Orange","is_correct":false},{"text":"Green","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_picture',
   'Which color is GREEN?', 'สีไหนคือ GREEN?', NULL, NULL,
   '[{"text":"Green","is_correct":true},{"text":"Yellow","is_correct":false},{"text":"Red","is_correct":false},{"text":"Blue","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_picture',
   'Which color is YELLOW?', 'สีไหนคือ YELLOW?', NULL, NULL,
   '[{"text":"Yellow","is_correct":true},{"text":"Green","is_correct":false},{"text":"Blue","is_correct":false},{"text":"Orange","is_correct":false}]'::jsonb),

  ((SELECT id FROM subjects WHERE slug = 'colors'), 'word_to_picture',
   'Which color is ORANGE?', 'สีไหนคือ ORANGE?', NULL, NULL,
   '[{"text":"Orange","is_correct":true},{"text":"Red","is_correct":false},{"text":"Yellow","is_correct":false},{"text":"Green","is_correct":false}]'::jsonb);
