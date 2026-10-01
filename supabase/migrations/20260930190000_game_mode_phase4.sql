-- Game mode, Phase 4: per-child mode + parent PIN.   NOT APPLIED to any database.
-- Apply AFTER 20260930170000 (profiles lock) and 20260930180000 (game_progress/game_order).
-- Additive only. Safe to re-run.
--
-- 1. profiles.learn_mode : 'game' | 'tutor' | NULL.  NULL = follow the subscription
--    default (Game, except tier='tutor' -> Tutor).  Set per child profile (or on the
--    parent's own profile when no child is active).
--    A BEFORE INSERT/UPDATE trigger stops any browser session (anon/authenticated)
--    from setting or changing it: the only writer is /api/learn-mode (service role),
--    which first verifies the parent PIN.  Without this, profiles_update RLS would let
--    a child flip their own mode from the console and bypass the PIN.
--
-- pin_hash = '!' is a sentinel: a row created only to track password attempts before a
-- PIN exists (first-time PIN also requires the account password).
--
-- 2. parent_pins : one row per parent login.  pin_hash is a salted+peppered scrypt hash
--    (never the PIN).  failed_attempts / locked_until / lockout_count implement 5 tries ->
--    escalating lockout (5 min, 15 min, 1 h, 24 h; the count decays after 24 h clean),
--    charged atomically by parent_pin_charge() below.  RLS enabled with NO policies and all privileges revoked from
--    anon/authenticated, so only the service role (server routes) can read or write.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learn_mode text;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_learn_mode_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_learn_mode_valid
  CHECK (learn_mode IS NULL OR learn_mode IN ('game', 'tutor'));

CREATE OR REPLACE FUNCTION public.profiles_lock_learn_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND NEW.learn_mode IS NOT NULL THEN
      RAISE EXCEPTION 'profiles.learn_mode cannot be set from the client' USING ERRCODE = '42501';
    ELSIF TG_OP = 'UPDATE' AND NEW.learn_mode IS DISTINCT FROM OLD.learn_mode THEN
      RAISE EXCEPTION 'profiles.learn_mode cannot be changed from the client' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_lock_learn_mode() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_lock_learn_mode ON public.profiles;
CREATE TRIGGER profiles_lock_learn_mode
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_lock_learn_mode();

CREATE TABLE IF NOT EXISTS public.parent_pins (
  user_id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash         text        NOT NULL,
  failed_attempts  integer     NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until     timestamptz,
  lockout_count    integer     NOT NULL DEFAULT 0 CHECK (lockout_count >= 0),
  last_failed_at   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Re-run safety if the table pre-dates these columns.
ALTER TABLE public.parent_pins ADD COLUMN IF NOT EXISTS lockout_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.parent_pins ADD COLUMN IF NOT EXISTS last_failed_at timestamptz;

ALTER TABLE public.parent_pins ENABLE ROW LEVEL SECURITY;
-- No policies, on purpose: RLS on + zero policies = deny all to anon/authenticated.

REVOKE ALL ON public.parent_pins FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.parent_pins TO service_role;

-- Atomic attempt charge. ONE statement: skips (returns no row) while locked, otherwise
-- counts the guess and, when it is the 5th, sets the escalating lock in the same
-- UPDATE. An expired lock restarts the count at zero. lockout_count decays to 0 once
-- the last failed guess is over 24 hours old. Returns the new count and any lock.
CREATE OR REPLACE FUNCTION public.parent_pin_charge(p_user uuid)
RETURNS TABLE (failed_attempts integer, locked_until timestamptz)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.parent_pins p SET
    failed_attempts = (CASE WHEN p.locked_until IS NOT NULL AND p.locked_until <= now() THEN 0 ELSE p.failed_attempts END) + 1,
    locked_until = CASE
      WHEN (CASE WHEN p.locked_until IS NOT NULL AND p.locked_until <= now() THEN 0 ELSE p.failed_attempts END) + 1 >= 5
      THEN now() + (CASE (CASE WHEN p.last_failed_at IS NULL OR p.last_failed_at < now() - interval '24 hours' THEN 0 ELSE p.lockout_count END)
                      WHEN 0 THEN interval '5 minutes'
                      WHEN 1 THEN interval '15 minutes'
                      WHEN 2 THEN interval '1 hour'
                      ELSE interval '24 hours' END)
      ELSE NULL END,
    lockout_count = (CASE WHEN p.last_failed_at IS NULL OR p.last_failed_at < now() - interval '24 hours' THEN 0 ELSE p.lockout_count END)
      + (CASE WHEN (CASE WHEN p.locked_until IS NOT NULL AND p.locked_until <= now() THEN 0 ELSE p.failed_attempts END) + 1 >= 5 THEN 1 ELSE 0 END),
    last_failed_at = now(),
    updated_at = now()
  WHERE p.user_id = p_user
    AND (p.locked_until IS NULL OR p.locked_until <= now())
  RETURNING p.failed_attempts, p.locked_until;
$$;

-- A correct PIN/password clears the counter and lock. If that guess was the 5th (which
-- had just locked the account) the lockout it caused is taken back.
CREATE OR REPLACE FUNCTION public.parent_pin_success(p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.parent_pins SET
    lockout_count = GREATEST(lockout_count - (CASE WHEN failed_attempts >= 5 THEN 1 ELSE 0 END), 0),
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = now()
  WHERE user_id = p_user;
$$;

-- This project's default privileges grant EXECUTE on new public functions to anon and
-- authenticated, so revoke explicitly; only the server (service role) may call these.
REVOKE ALL ON FUNCTION public.parent_pin_charge(uuid)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.parent_pin_success(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.parent_pin_charge(uuid)  TO service_role;
GRANT EXECUTE ON FUNCTION public.parent_pin_success(uuid) TO service_role;
