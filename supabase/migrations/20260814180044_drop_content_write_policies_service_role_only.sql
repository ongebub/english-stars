-- Part 2 of the anonymous-write lockdown.
--
-- Part 1 narrowed these from TO public to TO authenticated, which stopped
-- anonymous writes but still let ANY signed-in customer mutate course content
-- by calling PostgREST directly with their own JWT (demonstrated: a non-admin
-- account updated public.subjects).
--
-- All 15 admin write call sites now POST /api/admin/content, which checks the
-- caller against ADMIN_EMAIL server-side and writes with the service role. The
-- service role bypasses RLS, so these policies are no longer needed by any code
-- path and their only remaining effect is to permit writes we do not want.
--
-- Every SELECT policy is deliberately left in place: the app reads content
-- before login. signup_events is untouched.

-- flashcards
DROP POLICY IF EXISTS flashcards_insert ON public.flashcards;
DROP POLICY IF EXISTS flashcards_update ON public.flashcards;
DROP POLICY IF EXISTS flashcards_delete ON public.flashcards;

-- ebook_pages
DROP POLICY IF EXISTS ebook_pages_insert ON public.ebook_pages;
DROP POLICY IF EXISTS ebook_pages_update ON public.ebook_pages;
DROP POLICY IF EXISTS ebook_pages_delete ON public.ebook_pages;

-- picture_quiz_questions
DROP POLICY IF EXISTS picture_quiz_insert ON public.picture_quiz_questions;
DROP POLICY IF EXISTS picture_quiz_update_flagged ON public.picture_quiz_questions;
DROP POLICY IF EXISTS picture_quiz_delete ON public.picture_quiz_questions;

-- punchlist_items
DROP POLICY IF EXISTS punchlist_insert ON public.punchlist_items;
DROP POLICY IF EXISTS punchlist_update ON public.punchlist_items;

-- reader_books
DROP POLICY IF EXISTS reader_books_status_update ON public.reader_books;

-- reader_pages
DROP POLICY IF EXISTS reader_pages_flag_update ON public.reader_pages;

-- subjects
DROP POLICY IF EXISTS subjects_update_storybook ON public.subjects;
