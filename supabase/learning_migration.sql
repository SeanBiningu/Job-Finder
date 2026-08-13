-- Run this after schema.sql in the Supabase SQL Editor.
create table if not exists public.learning_rooms (
  id uuid primary key default uuid_generate_v4(),
  field text not null unique,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_room_members (
  room_id uuid not null references public.learning_rooms(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  goal text,
  skills text[] not null default '{}',
  joined_at timestamptz not null default now(),
  primary key (room_id, candidate_id)
);

create table if not exists public.learning_projects (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  idea text,
  field text not null,
  skills text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (candidate_id, title)
);

create table if not exists public.learning_sprints (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  field text not null,
  prompt text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.learning_rooms enable row level security;
alter table public.learning_room_members enable row level security;
alter table public.learning_projects enable row level security;
alter table public.learning_sprints enable row level security;

create policy "Anyone can read learning rooms" on public.learning_rooms for select using (true);
create policy "Authenticated users can create rooms" on public.learning_rooms for insert to authenticated with check (true);
create policy "Users manage own room membership" on public.learning_room_members for all to authenticated using (auth.uid() = candidate_id) with check (auth.uid() = candidate_id);
create policy "Users manage own projects" on public.learning_projects for all to authenticated using (auth.uid() = candidate_id) with check (auth.uid() = candidate_id);
create policy "Users manage own sprints" on public.learning_sprints for all to authenticated using (auth.uid() = candidate_id) with check (auth.uid() = candidate_id);
