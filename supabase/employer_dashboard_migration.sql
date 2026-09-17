-- Employer dashboard data and access controls. Run once in the Supabase SQL Editor.
-- These policies scope every employer read/write to companies they own.

alter type public.application_status add value if not exists 'shortlisted';
alter type public.application_status add value if not exists 'hired';

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'hiring_manager', 'recruiter', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.employer_notes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  interview_type text not null check (interview_type in ('video', 'phone', 'in_person')),
  meeting_location text not null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.employer_messages (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.employer_notifications (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.company_members enable row level security;
alter table public.employer_notes enable row level security;
alter table public.interviews enable row level security;
alter table public.employer_messages enable row level security;
alter table public.employer_notifications enable row level security;

create policy "Owners read company applications" on public.applications for select to authenticated using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = job_id and c.owner_id = auth.uid())
);
create policy "Owners update company applications" on public.applications for update to authenticated using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = job_id and c.owner_id = auth.uid())
);
create policy "Owners read applicant profiles" on public.profiles for select to authenticated using (
  exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where a.candidate_id = profiles.id and c.owner_id = auth.uid()
  )
);

create policy "Owners manage members" on public.company_members for all to authenticated using (
  exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
) with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "Owners manage employer notes" on public.employer_notes for all to authenticated using (
  exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
) with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
create policy "Owners manage interviews" on public.interviews for all to authenticated using (
  exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
) with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
create policy "Company participants read messages" on public.employer_messages for select to authenticated using (
  sender_id = auth.uid() or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
);
create policy "Owners send messages" on public.employer_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
);
create policy "Owners manage notifications" on public.employer_notifications for all to authenticated using (
  user_id = auth.uid() and exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
) with check (user_id = auth.uid());

create index if not exists interviews_company_schedule_idx on public.interviews(company_id, scheduled_at);
create index if not exists messages_application_created_idx on public.employer_messages(application_id, created_at);
create index if not exists notifications_user_created_idx on public.employer_notifications(user_id, created_at desc);
