-- Required by the browser flows in src/App.js.
-- Run once in the Supabase SQL Editor if these policies were not included in
-- the migration that created the core schema.

create policy "Users create own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "Employers create companies" on public.companies
  for insert to authenticated with check (auth.uid() = owner_id);

create policy "Company owners manage companies" on public.companies
  for update to authenticated using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Company owners create jobs" on public.jobs
  for insert to authenticated with check (
    exists (select 1 from public.companies where id = company_id and owner_id = auth.uid())
  );

create policy "Company owners update jobs" on public.jobs
  for update to authenticated using (
    exists (select 1 from public.companies where id = company_id and owner_id = auth.uid())
  );

create policy "Company owners delete jobs" on public.jobs
  for delete to authenticated using (
    exists (select 1 from public.companies where id = company_id and owner_id = auth.uid())
  );
