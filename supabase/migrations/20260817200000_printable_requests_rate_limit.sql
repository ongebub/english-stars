-- Rate-limiting support for /api/interview/printable.
--
-- From the independent security review of the original change (finding H1):
-- MAX_SENDS was enforced PER EMAIL ADDRESS, and nothing at all capped the
-- number of DISTINCT addresses one caller could submit. The reviewer drove 8
-- distinct addresses from a single IP with no throttling, every one of which
-- sent real mail. A script with a leaked address list could therefore send
-- unsolicited email from englishallstars.com to strangers at roughly two per
-- second — burning the Resend quota, and very likely costing us the sending
-- domain's reputation and the Resend account itself.
--
-- The endpoint is public and unauthenticated by design (the whole premise of
-- /interview is that nothing is demanded of the visitor), so the only caller
-- identity available is the network address. It is stored SALTED AND HASHED,
-- never in the clear: this is abuse prevention, not analytics, and a raw IP
-- list is personal data we have no reason to hold.
--
-- Counting rows by ip_hash covers the exact abuse vector, because the attack
-- requires a NEW address each time and every new address creates a row here.
-- Repeat submissions of an address that already exists never reach this path —
-- they are short-circuited by the per-address cooldown before any send.
--
-- FOLLOW-UP, not done here: ip_hash should be nulled once it is older than the
-- rate-limit window is capable of using (30 days is ample). It is deliberately
-- left for the existing retention job rather than bolted on in this migration.

ALTER TABLE public.printable_requests
  ADD COLUMN IF NOT EXISTS ip_hash text;

COMMENT ON COLUMN public.printable_requests.ip_hash IS
  'Salted SHA-256 of the submitting IP. Abuse prevention only. Never the raw address; not reversible without the server-side salt. Safe to null once older than 30 days.';

-- Supports "how many rows has this caller created in the last hour/day".
CREATE INDEX IF NOT EXISTS printable_requests_ip_hash_created_at_idx
  ON public.printable_requests (ip_hash, created_at DESC);

-- Supports the global daily send ceiling.
CREATE INDEX IF NOT EXISTS printable_requests_last_sent_at_idx
  ON public.printable_requests (last_sent_at DESC);

-- Unchanged and re-asserted: RLS stays on with zero policies, and anon and
-- authenticated hold no grants. The new column must not widen anything.
ALTER TABLE public.printable_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.printable_requests FROM anon, authenticated;
