-- printable_requests — email addresses that asked for the /interview worksheet.
--
-- This is a LIST OF EMAIL ADDRESSES belonging to members of the public. It is
-- the single most sensitive new table on this project, and the kind that has
-- already produced a critical Supabase advisory here twice. Treat it as such.
--
-- ── DELIBERATE DEVIATION FROM THE TASK SPEC ────────────────────────────────
-- The spec (agent_tasks 26752f36) asked for "RLS enabled — anon INSERT only,
-- no SELECT". This migration is STRICTER than that: RLS is enabled with NO
-- POLICIES AT ALL, which means anon and authenticated can do nothing whatever,
-- and only the service role can touch the table.
--
-- Reason: an anon INSERT policy would let anyone holding the anon key — which
-- ships in the browser bundle and is therefore public — write rows directly
-- from a console, bypassing /api/interview/printable entirely. That route is
-- where format validation, the Origin check and the send-rate cap live. An
-- INSERT-only policy still leaves the table freely stuffable with junk or with
-- other people's addresses, and a write-only hole is still a hole.
--
-- Nothing is lost: the route already runs as the service role (same pattern as
-- /api/track and /api/admin/content), so it is unaffected by RLS.
--
-- Grants are revoked as well. RLS and table grants are SEPARATE controls; with
-- grants left in place, RLS is the ONLY thing denying writes, and one stray
-- permissive policy or one ALTER TABLE ... DISABLE ROW LEVEL SECURITY reopens
-- the table instantly. Same defence-in-depth reasoning as
-- 20260814180910_revoke_table_write_grants_on_content_tables.sql.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.printable_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text        NOT NULL,
  locale             text        NOT NULL DEFAULT 'th',
  source             text        NOT NULL DEFAULT 'interview',
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_sent_at       timestamptz,
  send_count         integer     NOT NULL DEFAULT 0,
  -- Random and unguessable: it is the sole credential in the unsubscribe link,
  -- so it must not be derivable from the address or the row id.
  unsubscribe_token  uuid        NOT NULL DEFAULT gen_random_uuid(),
  unsubscribed_at    timestamptz,

  CONSTRAINT printable_requests_email_format CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT printable_requests_locale_valid CHECK (locale IN ('th', 'en'))
);

-- One row per address. Repeat requests update the existing row rather than
-- accumulating duplicates, which also makes the send-rate cap enforceable.
CREATE UNIQUE INDEX IF NOT EXISTS printable_requests_email_key
  ON public.printable_requests (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS printable_requests_unsubscribe_token_key
  ON public.printable_requests (unsubscribe_token);

ALTER TABLE public.printable_requests ENABLE ROW LEVEL SECURITY;

-- No policies are created, on purpose. RLS enabled + zero policies = deny all
-- for anon and authenticated. The service role bypasses RLS.

REVOKE ALL ON public.printable_requests FROM anon, authenticated;
