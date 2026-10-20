-- LINE Official Account (@209khnuv) webhook log. Adds one table; drops nothing.
-- Holds LINE user ids and message text from real parents, so it is service-role
-- only: RLS on, NO policies, and no grants for anon/authenticated.
create table if not exists public.line_events (
  id               uuid primary key default gen_random_uuid(),
  webhook_event_id text unique,              -- LINE's id; a redelivery hits the unique key and is dropped
  line_user_id     text not null,
  event_type       text not null check (event_type in ('follow','unfollow','message')),
  message_type     text,                     -- text, image, sticker ...
  text             text,                     -- text messages only, capped at 2000 chars
  replied          boolean not null default false,
  event_at         timestamptz,              -- LINE's own timestamp
  created_at       timestamptz not null default now()
);

alter table public.line_events enable row level security;
revoke all on table public.line_events from anon, authenticated;

create index if not exists line_events_user_idx on public.line_events (line_user_id, created_at desc);
