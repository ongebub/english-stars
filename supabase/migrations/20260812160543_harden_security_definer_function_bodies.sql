-- Add caller ownership checks to SECURITY DEFINER functions that previously
-- trusted a UUID passed in as an argument, and pin search_path on the five
-- functions flagged with a mutable search_path.
--
-- The auth.uid() IS NOT NULL condition preserves internal/service-role use
-- (where auth.uid() is null); anon loses EXECUTE separately in the next
-- migration, so an unauthenticated caller cannot reach these at all.

-- 1. get_subject_medals: was readable for ANY child id by any caller.
CREATE OR REPLACE FUNCTION public.get_subject_medals(p_child_id uuid)
 RETURNS TABLE(subject_id uuid, flashcards_complete boolean, quiz_medal text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Caller must be the child themselves, or that child's parent.
  IF auth.uid() IS NOT NULL
     AND p_child_id <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles pr
       WHERE pr.id = p_child_id AND pr.parent_id = auth.uid()
     )
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id as subject_id,
    COALESCE(
      (SELECT sfc.is_complete
       FROM public.subject_flashcard_completion sfc
       WHERE sfc.child_id = p_child_id
       AND sfc.subject_id = s.id),
      false
    ) as flashcards_complete,
    CASE
      WHEN (SELECT MAX(qa.score) FROM public.quiz_attempts qa WHERE qa.subject_id = s.id AND qa.child_id = p_child_id) = 10 THEN 'gold'
      WHEN (SELECT MAX(qa.score) FROM public.quiz_attempts qa WHERE qa.subject_id = s.id AND qa.child_id = p_child_id) >= 8 THEN 'silver'
      WHEN (SELECT MAX(qa.score) FROM public.quiz_attempts qa WHERE qa.subject_id = s.id AND qa.child_id = p_child_id) >= 6 THEN 'bronze'
      ELSE null
    END as quiz_medal
  FROM public.subjects s
  WHERE s.is_published = true;
END;
$function$;

-- 2. check_access_status: was readable for ANY user id. Only call site is
--    middleware, which always passes the caller's own id.
CREATE OR REPLACE FUNCTION public.check_access_status(check_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND check_user_id <> auth.uid() THEN 'none'
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = check_user_id
        AND s.status IN ('active','trialing','past_due')
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM public.tutor_students ts
      JOIN public.subscriptions s ON s.user_id = ts.tutor_user_id
      WHERE ts.student_user_id = check_user_id
        AND ts.removed_at IS NULL
        AND s.tier = 'tutor'
        AND s.status IN ('active','trialing','past_due')
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM public.tutor_students ts
      WHERE ts.student_user_id = check_user_id
        AND ts.removed_at IS NULL
    ) THEN 'tutor_lapsed'
    ELSE 'none'
  END;
$function$;

-- 3. has_active_access: same unguarded shape. No call sites in the app and no
--    RLS policy references it, but guard it anyway rather than leave it armed.
CREATE OR REPLACE FUNCTION public.has_active_access(check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND check_user_id <> auth.uid() THEN false
  ELSE (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = check_user_id
        AND s.status IN ('active','trialing','past_due')
    ) OR EXISTS (
      SELECT 1 FROM public.tutor_students ts
      JOIN public.subscriptions s ON s.user_id = ts.tutor_user_id
      WHERE ts.student_user_id = check_user_id
        AND ts.removed_at IS NULL
        AND s.tier = 'tutor'
        AND s.status IN ('active','trialing','past_due')
    )
  ) END;
$function$;

-- 4-7. Mutable search_path only; behaviour unchanged, all references qualified.
--      reject_temporary_cdn_urls stays attached to its six triggers — CREATE OR
--      REPLACE does not detach them.
CREATE OR REPLACE FUNCTION public.reject_temporary_cdn_urls()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  payload text;
BEGIN
  payload := coalesce(to_jsonb(NEW)::text, '');
  IF payload ILIKE '%cloudfront%' THEN
    RAISE EXCEPTION 'BLOCKED: temporary cloudfront URL in % — re-host to Supabase storage first (guard installed 16 Jul 2026)', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.subject_completion_counts()
 RETURNS TABLE(subject_id uuid, flashcard_count bigint, quiz_count bigint, picture_quiz_count bigint, ebook_page_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path = ''
AS $function$
  SELECT s.id AS subject_id,
    (SELECT count(*) FROM public.flashcards WHERE subject_id = s.id),
    (SELECT count(*) FROM public.quiz_questions WHERE subject_id = s.id),
    (SELECT count(*) FROM public.picture_quiz_questions WHERE subject_id = s.id),
    (SELECT count(*) FROM public.ebook_pages WHERE subject_id = s.id)
  FROM public.subjects s;
$function$;

CREATE OR REPLACE FUNCTION public.update_quiz_question_images()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  q RECORD; updated_options jsonb; opt jsonb; img_url text;
BEGIN
  FOR q IN SELECT id, options FROM public.quiz_questions
           WHERE question_type = 'word_to_picture'
  LOOP
    updated_options := '[]'::jsonb;
    FOR opt IN SELECT * FROM jsonb_array_elements(q.options)
    LOOP
      SELECT image_url INTO img_url
      FROM public.quiz_option_images
      WHERE option_text = LOWER(TRIM(opt->>'text'))
      LIMIT 1;
      updated_options := updated_options || jsonb_build_array(
        jsonb_build_object('text', opt->>'text',
          'image_url', COALESCE(img_url, opt->>'image_url'),
          'is_correct', (opt->>'is_correct')::boolean));
    END LOOP;
    UPDATE public.quiz_questions SET options = updated_options WHERE id = q.id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_existing_image(p_text text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  v_url text;
BEGIN
  SELECT image_url INTO v_url FROM public.quiz_option_images
  WHERE option_text = LOWER(TRIM(p_text)) LIMIT 1;
  IF v_url IS NOT NULL THEN RETURN v_url; END IF;

  SELECT image_url INTO v_url FROM public.flashcards
  WHERE LOWER(TRIM(word_en)) = LOWER(TRIM(p_text))
  AND image_url IS NOT NULL LIMIT 1;
  RETURN v_url;
END;
$function$;

-- 8. View ran with definer (owner) rights, bypassing flashcard_progress RLS,
--    and anon/authenticated held full privileges on it.
ALTER VIEW public.subject_flashcard_completion SET (security_invoker = true);
