-- Record which promotion code, if any, was redeemed on a subscription.
--
-- Chris is running a review-exchange programme: one 100%-off-once code, capped
-- at 40 redemptions. Stripe knows the redemption count, but it does not tell you
-- WHICH of our accounts used it — and matching the 40 redeemers back to accounts
-- is the entire point of the programme. Storing the code at checkout time is the
-- only moment both facts are in the same place.
--
-- Two columns rather than one:
--   promotion_code    the human-readable code the customer typed, e.g. REVIEW100.
--                     This is what Chris will actually search by.
--   promotion_code_id the Stripe promo object id (promo_...), because codes can
--                     be edited or reused and the id is the stable handle.
--
-- Nullable, because the overwhelming majority of subscriptions have no code.
--
-- NO RLS CHANGE. subscriptions already has RLS enabled with its existing
-- policies; adding a nullable column does not widen them. Verified separately:
-- the columns must not become readable by anon.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS promotion_code text,
  ADD COLUMN IF NOT EXISTS promotion_code_id text;

COMMENT ON COLUMN public.subscriptions.promotion_code IS
  'Human-readable Stripe promotion code redeemed at checkout, e.g. REVIEW100. Null when no code was used.';
COMMENT ON COLUMN public.subscriptions.promotion_code_id IS
  'Stripe promotion code object id (promo_...). Stable handle; the text code can be changed in Stripe.';

-- Chris''s question is always "who redeemed the code?", so index the lookup
-- rather than the full column — the vast majority of rows are NULL.
CREATE INDEX IF NOT EXISTS subscriptions_promotion_code_idx
  ON public.subscriptions (promotion_code)
  WHERE promotion_code IS NOT NULL;
