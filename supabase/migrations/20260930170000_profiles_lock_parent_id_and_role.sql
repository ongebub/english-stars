-- Stop clients changing profiles.parent_id or profiles.role.   NOT APPLIED.
--
-- Problem: policy profiles_update is USING (auth.uid() = id OR auth.uid() = parent_id)
-- with no WITH CHECK, so any signed-in user can PATCH their own profile row to
-- role='child', parent_id=<someone else's id> and appear in that person's child
-- picker. Nothing legitimate ever changes these two columns on an existing row.
--
-- Fix: a BEFORE UPDATE trigger that rejects any change to parent_id or role when
-- the request comes in as a client role (anon / authenticated). The service role
-- (server routes, Stripe webhook, account delete) and the SQL editor / migrations
-- (no JWT role) are unaffected.
--
-- Deliberately UPDATE only. Inserts are not touched, so handle_new_user (signup),
-- create_child_profile (SECURITY DEFINER), /api/profile, /api/join and
-- /api/school/join keep working exactly as before.
--
-- Audited in-app UPDATE paths on profiles (none write parent_id or role):
-- display_name / avatar_emoji (AccountClient, settings/profile, tutor
-- update-student-profile, tutor_update_student_name RPC), deleted_at (account
-- soft-delete and restore), account_type (signup, subscribe, stripe webhook).
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.profiles_lock_parent_and_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.parent_id IS DISTINCT FROM OLD.parent_id OR NEW.role IS DISTINCT FROM OLD.role)
     AND COALESCE(auth.role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'profiles.parent_id and profiles.role cannot be changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_lock_parent_and_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_lock_parent_and_role ON public.profiles;
CREATE TRIGGER profiles_lock_parent_and_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_lock_parent_and_role();
