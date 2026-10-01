-- game_order values.  FINAL per Chris (2026-09-30): no Matt review needed.  NOT APPLIED.
-- (File name kept from when this was a proposal.)
-- Needs supabase/migrations/20260930180000_game_mode_phase2.sql applied first.
--
-- Method: start from today's sort_order within each band, then move only the
-- subjects that were clearly added later and landed out of place. Every move is
-- marked "MOVED". This is an editorial guess, not a curriculum: sort_order was
-- never designed as a learning order (polite-words is band K but sort 27;
-- family-members/weather/clothing were appended at 35-37).
-- To reorder later: only the numbers matter, gaps are fine, lowest = first.
-- Subjects not listed keep game_order NULL (falls back to sort_order).
-- Interview Practice (band 'all') is deliberately not on any map.
-- Only writes game_order on subjects. No rows are deleted.

UPDATE public.subjects s SET game_order = v.ord
FROM (VALUES
  -- Kindergarten (13)
  ('abcs',                 10),
  ('phonics-sounds',       20),
  ('numbers-counting',     30),
  ('colors',               40),
  ('shapes',               50),
  ('animals',              60),
  ('food-drink',           70),
  ('body-parts',           80),
  ('five-senses',          90),
  ('family-members',      100),  -- MOVED: was sort 35
  ('clothing',            110),  -- MOVED: was sort 37
  ('weather',             120),  -- MOVED: was sort 36
  ('polite-words',        130),  -- MOVED: was sort 27

  -- Grade 1 (12)
  ('sight-words',          10),  -- MOVED: was sort 38
  ('phonics-blending',     20),  -- MOVED: was sort 17
  ('rhyming-words',        30),  -- MOVED: was sort 21
  ('this-that-these-those',40),  -- MOVED: was sort 40
  ('plants',               50),
  ('feelings-emotions',    60),
  ('at-school',            70),  -- MOVED: was sort 16
  ('around-the-house',     80),  -- MOVED: was sort 15
  ('buildings',            90),
  ('vehicles',            100),
  ('jobs-careers',        110),
  ('days-months-seasons', 120),  -- MOVED: was sort 39

  -- Grade 2 (12 published; 'articles' is unpublished and not listed)
  ('common-verbs',         10),
  ('prepositions',         20),
  ('pronouns',             30),  -- MOVED: was sort 31
  ('plurals',              40),  -- MOVED: was sort 43
  ('possessives',          50),  -- MOVED: was sort 42
  ('there-is-there-are',   60),  -- MOVED: was sort 44
  ('adjectives',           70),
  ('comparisons',          80),
  ('synonyms-antonyms',    90),
  ('question-words',      100),
  ('hobbies',             110),
  ('time-daily-routines', 120),  -- MOVED: was sort 41

  -- Grade 3 (4 published; 'modals-requests' is unpublished and not listed)
  ('subject-verb',         10),
  ('tenses',               20),
  ('countable-uncountable',30),  -- MOVED: was sort 33
  ('idioms-1',             40)   -- MOVED: was sort 28
) AS v(slug, ord)
WHERE s.slug = v.slug;
