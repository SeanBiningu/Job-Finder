-- Workly marketplace data model for Supabase
create extension if not exists "uuid-ossp";

create type public.user_role as enum ('candidate', 'employer', 'admin');
create type public.job_type as enum ('full_time', 'part_time', 'internship', 'apprenticeship', 'graduate', 'contract');
create type public.application_status as enum ('submitted', 'reviewing', 'interview', 'offer', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'candidate',
  headline text,
  location text,
  avatar_url text,
  bio text,
  profile_strength smallint not null default 0 check (profile_strength between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  logo_url text,
  website text,
  description text,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text not null,
  location text not null default 'Remote',
  is_remote boolean not null default false,
  job_type public.job_type not null,
  salary_min integer,
  salary_max integer,
  currency text not null default 'USD',
  required_skills text[] not null default '{}',
  is_published boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  cv_url text,
  cover_letter text,
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create table public.saved_jobs (
  candidate_id uuid references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, job_id)
);

create table public.skills (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  assessment_minutes smallint
);

create table public.skill_verifications (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  score smallint check (score between 0 and 100),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (candidate_id, skill_id)
);

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.skills enable row level security;
alter table public.skill_verifications enable row level security;

create policy "Public can read published jobs" on public.jobs for select using (is_published = true);
create policy "Public can read companies" on public.companies for select using (true);
create policy "Public can read skills" on public.skills for select using (true);
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Candidates manage own applications" on public.applications for all using (auth.uid() = candidate_id);
create policy "Candidates manage saved jobs" on public.saved_jobs for all using (auth.uid() = candidate_id);
create policy "Candidates read own verification" on public.skill_verifications for select using (auth.uid() = candidate_id);

create index jobs_search_idx on public.jobs using gin (to_tsvector('english', title || ' ' || description));
create index jobs_company_idx on public.jobs(company_id);
create index applications_candidate_idx on public.applications(candidate_id);
