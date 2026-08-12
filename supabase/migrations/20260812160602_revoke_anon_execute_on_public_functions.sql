-- Remove the blanket PUBLIC/anon EXECUTE grants on public functions.
-- `authenticated` is granted back only where the app actually calls the
-- function over PostgREST with a user session (verified against every .rpc()
-- call site in the repo).

-- ---- Called from the app with a user session: authenticated only ----
REVOKE ALL ON FUNCTION public.check_access_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_access_status(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_child_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_child_profile(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_subject_medals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_subject_medals(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_tutor_students(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tutor_students(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_tutor_student_progress(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tutor_student_progress(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.tutor_update_student_name(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tutor_update_student_name(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.subject_completion_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subject_completion_counts() TO authenticated;

-- ---- Never called over RPC: revoke from anon AND authenticated ----
-- Trigger functions. Revoking EXECUTE does not stop the triggers firing;
-- Postgres does not check EXECUTE when invoking a trigger function.
REVOKE ALL ON FUNCTION public.enforce_tutor_seat_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_temporary_cdn_urls() FROM PUBLIC, anon, authenticated;

-- No call sites anywhere in the codebase; maintenance/service-role only.
REVOKE ALL ON FUNCTION public.has_active_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_quiz_question_images() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_existing_image(text) FROM PUBLIC, anon, authenticated;

-- service_role keeps EXECUTE on everything (server-side scripts and routes).
GRANT EXECUTE ON FUNCTION public.enforce_tutor_seat_limit() TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_temporary_cdn_urls() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_quiz_question_images() TO service_role;
GRANT EXECUTE ON FUNCTION public.find_existing_image(text) TO service_role;

-- ---- View privileges: it held arwdDxtm (full DML) for anon and authenticated ----
REVOKE ALL ON public.subject_flashcard_completion FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subject_flashcard_completion TO authenticated;
