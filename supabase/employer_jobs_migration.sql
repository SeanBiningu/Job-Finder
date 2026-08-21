-- Persisted employer job listings: run once in Supabase SQL Editor.
-- Existing creation/update/delete policies live in ui_connection_migration.sql.

create policy "Company owners read own jobs" on public.jobs
  for select to authenticated using (
    exists (select 1 from public.companies where id = company_id and owner_id = auth.uid())
  );
