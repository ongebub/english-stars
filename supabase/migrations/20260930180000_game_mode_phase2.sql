-- Game mode, Phase 2: castle progress + map ordering.   NOT APPLIED to any database.
-- Additive only: one nullable column, one new table. Nothing is dropped or rewritten.
--
-- 1. subjects.game_order : position of a subject on its grade band's map.
--    NULL means "fall back to sort_order", so Tutor mode's grid (which orders by
--    sort_order) is untouched. The proposed values live in
--    supabase/seeds/game_order_proposed.sql and are for Matt to confirm.
--
-- 2. game_progress : one derived row per (child profile, subject) = one castle.
--    It is a cache of "is this castle done, and with what flag", computed by the
--    server route /api/game/complete-check from quiz_attempts, flashcard_progress
--    and ebook_progress (which stay the source of truth).
--
--    SECURITY MODEL (same shape as printable_requests):
--      * RLS enabled.
--      * ONE policy: SELECT, role authenticated, own row or the parent's child row.
--      * NO insert/update/delete policy, and table privileges revoked, so a browser
--        holding the anon key or a logged-in session can never write a flag. Only
--        the service role (the server route) writes, after checking the child
--        belongs to the session user.
--      * anon has no access at all.

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS game_order integer;

CREATE TABLE IF NOT EXISTS public.game_progress (
  child_id          uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  subject_id        uuid        NOT NULL REFERENCES public.subjects(id)  ON DELETE CASCADE,
  unlocked_at       timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  best_quiz_score   integer,
  best_quiz_total   integer,
  flashcards_done   boolean     NOT NULL DEFAULT false,
  storybook_done    boolean     NOT NULL DEFAULT false,
  flag_level        text,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, subject_id),
  CONSTRAINT game_progress_flag_level_valid CHECK (flag_level IS NULL OR flag_level IN ('bronze','silver','gold')),
  CONSTRAINT game_progress_score_sane CHECK (
    best_quiz_score IS NULL OR (best_quiz_total > 0 AND best_quiz_score BETWEEN 0 AND best_quiz_total)
  )
);

CREATE INDEX IF NOT EXISTS game_progress_subject_id_idx ON public.game_progress (subject_id);

ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY game_progress_select ON public.game_progress
  FOR SELECT TO authenticated
  USING (
    child_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = game_progress.child_id
        AND p.parent_id = (SELECT auth.uid())
    )
  );

-- RLS and privileges are separate controls; remove the write privileges too.
REVOKE ALL ON public.game_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.game_progress TO authenticated;
GRANT ALL ON public.game_progress TO service_role;
