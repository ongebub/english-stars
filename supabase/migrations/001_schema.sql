-- ============================================================
-- English Stars - Initial Schema Migration
-- ============================================================

-- 1. TABLES
-- ============================================================

create table subjects (
  id            uuid primary key default gen_random_uuid(),
  module        int not null check (module in (1, 2)),
  slug          text unique not null,
  title_en      text not null,
  title_th      text not null,
  emoji         text not null default '',
  sort_order    int not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table flashcards (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references subjects(id) on delete cascade,
  word_en       text not null,
  word_th       text,
  image_url     text,
  audio_url     text,
  sort_order    int not null default 0,
  created_at    timestamptz default now()
);

create table ebook_pages (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references subjects(id) on delete cascade,
  page_number   int not null,
  text_en       text not null,
  image_url     text,
  audio_url     text,
  created_at    timestamptz default now()
);

create table quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references subjects(id) on delete cascade,
  question_type text not null check (question_type in ('word_to_letter', 'fill_blank', 'word_to_picture')),
  prompt_en     text not null,
  prompt_th     text,
  image_url     text,
  audio_url     text,
  options       jsonb not null default '[]',
  created_at    timestamptz default now()
);

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('parent', 'child')) default 'parent',
  display_name  text not null,
  parent_id     uuid references profiles(id) on delete cascade,
  avatar_emoji  text not null default '🧒',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table quiz_attempts (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references profiles(id) on delete cascade,
  subject_id      uuid not null references subjects(id) on delete cascade,
  questions_shown jsonb not null default '[]',
  answers         jsonb not null default '[]',
  score           int not null default 0,
  total           int not null default 0,
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

create table subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id  text,
  opn_customer_id     text,
  status              text not null check (status in ('active', 'inactive', 'past_due', 'canceled')) default 'inactive',
  plan                text not null check (plan in ('monthly', 'annual')) default 'monthly',
  current_period_end  timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 2. ENABLE ROW-LEVEL SECURITY
-- ============================================================

alter table subjects        enable row level security;
alter table flashcards      enable row level security;
alter table ebook_pages     enable row level security;
alter table quiz_questions  enable row level security;
alter table profiles        enable row level security;
alter table quiz_attempts   enable row level security;
alter table subscriptions   enable row level security;

-- 3. RLS POLICIES
-- ============================================================

-- subjects: readable by everyone (anon + authenticated)
create policy "subjects_select" on subjects
  for select using (true);

-- flashcards: readable by everyone
create policy "flashcards_select" on flashcards
  for select using (true);

-- ebook_pages: readable by everyone
create policy "ebook_pages_select" on ebook_pages
  for select using (true);

-- quiz_questions: readable by everyone
create policy "quiz_questions_select" on quiz_questions
  for select using (true);

-- profiles: select own profile or children's profiles
create policy "profiles_select" on profiles
  for select using (
    auth.uid() = id
    or auth.uid() = parent_id
  );

-- profiles: insert own profile
create policy "profiles_insert" on profiles
  for insert with check (
    auth.uid() = id
  );

-- profiles: update own profile
create policy "profiles_update" on profiles
  for update using (
    auth.uid() = id
  );

-- quiz_attempts: select for child or parent of child
create policy "quiz_attempts_select" on quiz_attempts
  for select using (
    auth.uid() = child_id
    or auth.uid() in (
      select parent_id from profiles where id = quiz_attempts.child_id
    )
  );

-- quiz_attempts: insert for authenticated users
create policy "quiz_attempts_insert" on quiz_attempts
  for insert with check (
    auth.uid() is not null
  );

-- subscriptions: select own subscription
create policy "subscriptions_select" on subscriptions
  for select using (
    auth.uid() = user_id
  );

-- subscriptions: insert own subscription
create policy "subscriptions_insert" on subscriptions
  for insert with check (
    auth.uid() = user_id
  );

-- subscriptions: update own subscription
create policy "subscriptions_update" on subscriptions
  for update using (
    auth.uid() = user_id
  );

-- 4. INDEXES
-- ============================================================

-- Foreign-key indexes
create index idx_flashcards_subject_id    on flashcards(subject_id);
create index idx_ebook_pages_subject_id   on ebook_pages(subject_id);
create index idx_quiz_questions_subject_id on quiz_questions(subject_id);
create index idx_profiles_parent_id       on profiles(parent_id);
create index idx_quiz_attempts_child_id   on quiz_attempts(child_id);
create index idx_quiz_attempts_subject_id on quiz_attempts(subject_id);

-- Common query indexes
create index idx_subjects_module          on subjects(module);
create index idx_subjects_slug            on subjects(slug);
create index idx_subjects_sort_order      on subjects(sort_order);
create index idx_flashcards_sort_order    on flashcards(subject_id, sort_order);
create index idx_ebook_pages_page_number  on ebook_pages(subject_id, page_number);
create index idx_subscriptions_status     on subscriptions(status);
