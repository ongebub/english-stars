-- Part 1 (fast fix) of the anonymous-write lockdown.
--
-- These 14 write policies were TO public, which includes anon. Combined with
-- /admin/* and /punchlist having no auth guard, anyone on the internet could
-- edit published course content. This narrows WHO can write; the USING and
-- WITH CHECK expressions are recreated unchanged.
--
-- Residual risk, knowingly accepted for now: any signed-in user can still write
-- to these tables by crafting a request directly. Part 2 (filed separately)
-- moves the admin writes onto the service role and drops these policies.
--
-- SELECT policies are deliberately untouched: the app reads content before
-- login. signup_events is deliberately untouched: anonymous visitors insert
-- landing_viewed before they have an account.

-- flashcards
DROP POLICY IF EXISTS flashcards_insert ON public.flashcards;
CREATE POLICY flashcards_insert ON public.flashcards
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS flashcards_update ON public.flashcards;
CREATE POLICY flashcards_update ON public.flashcards
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS flashcards_delete ON public.flashcards;
CREATE POLICY flashcards_delete ON public.flashcards
  FOR DELETE TO authenticated USING (true);

-- ebook_pages
DROP POLICY IF EXISTS ebook_pages_insert ON public.ebook_pages;
CREATE POLICY ebook_pages_insert ON public.ebook_pages
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS ebook_pages_update ON public.ebook_pages;
CREATE POLICY ebook_pages_update ON public.ebook_pages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ebook_pages_delete ON public.ebook_pages;
CREATE POLICY ebook_pages_delete ON public.ebook_pages
  FOR DELETE TO authenticated USING (true);

-- picture_quiz_questions
DROP POLICY IF EXISTS picture_quiz_insert ON public.picture_quiz_questions;
CREATE POLICY picture_quiz_insert ON public.picture_quiz_questions
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS picture_quiz_update_flagged ON public.picture_quiz_questions;
CREATE POLICY picture_quiz_update_flagged ON public.picture_quiz_questions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS picture_quiz_delete ON public.picture_quiz_questions;
CREATE POLICY picture_quiz_delete ON public.picture_quiz_questions
  FOR DELETE TO authenticated USING (true);

-- punchlist_items
DROP POLICY IF EXISTS punchlist_insert ON public.punchlist_items;
CREATE POLICY punchlist_insert ON public.punchlist_items
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS punchlist_update ON public.punchlist_items;
CREATE POLICY punchlist_update ON public.punchlist_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- reader_books
DROP POLICY IF EXISTS reader_books_status_update ON public.reader_books;
CREATE POLICY reader_books_status_update ON public.reader_books
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- reader_pages
DROP POLICY IF EXISTS reader_pages_flag_update ON public.reader_pages;
CREATE POLICY reader_pages_flag_update ON public.reader_pages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- subjects
DROP POLICY IF EXISTS subjects_update_storybook ON public.subjects;
CREATE POLICY subjects_update_storybook ON public.subjects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
