-- Defence in depth, from the independent security review of Part 2.
--
-- The 14 RLS write policies are gone, but anon and authenticated still hold
-- table-level INSERT/UPDATE/DELETE/TRUNCATE grants on these tables. That makes
-- RLS the SINGLE control denying writes: re-adding a permissive policy by
-- mistake, or one ALTER TABLE ... DISABLE ROW LEVEL SECURITY, reopens the hole
-- instantly.
--
-- All writes to these tables now go through the service role (via
-- /api/admin/content) or service-role node scripts, neither of which is
-- affected by grants to anon/authenticated.
--
-- SELECT is deliberately NOT revoked — the app reads content logged out.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.flashcards             FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ebook_pages            FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.picture_quiz_questions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.punchlist_items        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.reader_books           FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.reader_pages           FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subjects               FROM anon, authenticated;
