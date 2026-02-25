-- Aux: weekly music club schema
-- Run this in the Supabase SQL Editor to set up the database

-- =============================================================================
-- Tables
-- =============================================================================

create table groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  songs_per_round int not null default 3,
  created_at timestamptz default now()
);

create table members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade not null,
  name text not null,
  avatar text not null default '🎵',
  is_admin boolean not null default false,
  created_at timestamptz default now(),
  unique(group_id, name)
);

create table rounds (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade not null,
  number int not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz default now(),
  unique(group_id, number)
);

create table songs (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references rounds(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  title text not null,
  artist text not null,
  album text,
  thumbnail_url text,
  spotify_url text,
  youtube_url text,
  odesli_page_url text,
  created_at timestamptz default now()
);

create table votes (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references songs(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  rating numeric(2,1) not null check (rating >= 0 and rating <= 5),
  created_at timestamptz default now(),
  unique(song_id, member_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Members: lookup by group
create index idx_members_group_id on members(group_id);

-- Rounds: lookup by group, sorted by number
create index idx_rounds_group_id on rounds(group_id);
create index idx_rounds_group_id_number on rounds(group_id, number desc);

-- Rounds: find current round by date range within a group
create index idx_rounds_group_dates on rounds(group_id, starts_at, ends_at);

-- Songs: lookup by round and member
create index idx_songs_round_id on songs(round_id);
create index idx_songs_member_id on songs(member_id);

-- Votes: lookup by song and member
create index idx_votes_song_id on votes(song_id);
create index idx_votes_member_id on votes(member_id);

-- =============================================================================
-- Row Level Security (permissive — lab product, slug is the "key")
-- =============================================================================

alter table groups enable row level security;
alter table members enable row level security;
alter table rounds enable row level security;
alter table songs enable row level security;
alter table votes enable row level security;

-- Groups: anon can read all, insert new groups
create policy "groups_select" on groups for select to anon using (true);
create policy "groups_insert" on groups for insert to anon with check (true);
create policy "groups_update" on groups for update to anon using (true) with check (true);

-- Members: anon can read/write all
create policy "members_select" on members for select to anon using (true);
create policy "members_insert" on members for insert to anon with check (true);
create policy "members_update" on members for update to anon using (true) with check (true);
create policy "members_delete" on members for delete to anon using (true);

-- Rounds: anon can read/write all
create policy "rounds_select" on rounds for select to anon using (true);
create policy "rounds_insert" on rounds for insert to anon with check (true);
create policy "rounds_update" on rounds for update to anon using (true) with check (true);

-- Songs: anon can read/write all
create policy "songs_select" on songs for select to anon using (true);
create policy "songs_insert" on songs for insert to anon with check (true);
create policy "songs_update" on songs for update to anon using (true) with check (true);
create policy "songs_delete" on songs for delete to anon using (true);

-- Votes: anon can read/write all
create policy "votes_select" on votes for select to anon using (true);
create policy "votes_insert" on votes for insert to anon with check (true);
create policy "votes_update" on votes for update to anon using (true) with check (true);
create policy "votes_delete" on votes for delete to anon using (true);
