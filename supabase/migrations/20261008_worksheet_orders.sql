-- ============================================================================
--  NOT APPLIED.  Drafted 2026-10-08 on branch worksheet-shop.
--  Chris approves before this runs. It lives in supabase/pending/, not
--  supabase/migrations/, so no tool that applies the migrations folder can
--  pick it up by accident. Move it once it has been applied.
--
--  Adds only: one table, one private bucket. Nothing is dropped or changed.
-- ============================================================================

-- One row per paid worksheet Checkout session. Holds a buyer email, so it is
-- service-role only: RLS on, and NO policy for anon or authenticated. A table
-- with RLS and no policy is readable and writable only by the service role,
-- which is how the webhook, the thanks page and the download route use it.
create table if not exists public.worksheet_orders (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,          -- idempotency key for webhook + thanks page
  offer             text not null check (offer in ('1','2','3','4','5','6','bundle')),
  email             text,                          -- from Stripe customer_details.email
  amount_thb        integer,                       -- whole baht actually paid
  download_token    text not null unique,          -- unguessable; the emailed link carries it
  download_count    integer not null default 0,
  expires_at        timestamptz not null,
  email_claimed_at  timestamptz,                   -- taken just before sending, so two callers cannot both send
  email_sent_at     timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.worksheet_orders enable row level security;

-- Belt and braces: the Supabase default grants would otherwise hand anon and
-- authenticated table privileges that RLS then blocks. Take them away too.
revoke all on table public.worksheet_orders from anon, authenticated;

create index if not exists worksheet_orders_email_idx on public.worksheet_orders (email);

-- Private bucket for the PDFs (public = false). No storage.objects policy is
-- added on purpose: with none, only the service role can read or write, and
-- downloads go out as 60-second signed URLs minted by /api/worksheets/download.
-- Do NOT make this bucket public-read like the others; that would publish the
-- paid files.
insert into storage.buckets (id, name, public)
values ('worksheet-packs', 'worksheet-packs', false)
on conflict (id) do nothing;

-- Files to upload afterwards (service role), key -> file:
--   packs/pack-01.pdf ... packs/pack-06.pdf
