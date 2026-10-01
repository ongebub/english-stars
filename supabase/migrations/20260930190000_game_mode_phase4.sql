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
-- 2. parent_pins : one row per parent login.  pin_hash is a salted+peppered scrypt hash
--    (never the PIN).  failed_attempts / locked_until implement the 5-tries ->
--    5-minute lockout.  RLS enabled with NO policies and all privileges revoked from
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
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_pins ENABLE ROW LEVEL SECURITY;
-- No policies, on purpose: RLS on + zero policies = deny all to anon/authenticated.

REVOKE ALL ON public.parent_pins FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.parent_pins TO service_role;
