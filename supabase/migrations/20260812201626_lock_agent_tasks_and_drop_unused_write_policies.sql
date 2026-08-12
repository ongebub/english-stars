-- Three tables whose permissive write policies back NO browser code path.
-- Verified against every .from() call site in src/, scripts/, "ebook scripts/"
-- and reader-work/: all remaining writes are service-role node scripts or
-- service-role route handlers, which bypass RLS and are unaffected.

-- 1. agent_tasks: policy was FOR ALL TO public USING (true) WITH CHECK (true),
--    so anon could read AND rewrite the whole agent task queue (161 rows of
--    internal specs and results). Zero references in application code — the
--    table is touched only over MCP/SQL, which connects as postgres
--    (rolbypassrls = true), so the coordination channel is unaffected.
--    Leaving RLS enabled with no policies = service-role only, matching
--    child_sessions / email_log / verification_codes.
DROP POLICY IF EXISTS agent_tasks_all ON public.agent_tasks;

-- 2. quiz_questions: every src/ reference is a .select(). All inserts and
--    deletes come from service-role .mjs scripts and root-level .sql files run
--    through the SQL editor. There is no UPDATE policy and none is needed.
DROP POLICY IF EXISTS quiz_questions_insert ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_questions_delete ON public.quiz_questions;

-- 3. image_catalog: all three src/ references are reads (admin/page.tsx:39,
--    admin/reader-review/page.tsx:64, admin/catalog/page.tsx:48). Every write
--    is a service-role upsert from an ebook script.
DROP POLICY IF EXISTS catalog_update ON public.image_catalog;

-- NOT dropped here, deliberately: the permissive write policies on
-- ebook_pages, flashcards, picture_quiz_questions, reader_books, reader_pages,
-- subjects and punchlist_items. Those back live browser writes from
-- /admin/* and /punchlist, which currently have NO authentication (they are
-- absent from both protectedRoutes and semiProtectedRoutes in
-- src/middleware.ts, there is no admin layout, and the pages contain no
-- getUser/redirect guard). Dropping the policies would break the review tools;
-- the real fix is to put those pages behind an admin check first.
