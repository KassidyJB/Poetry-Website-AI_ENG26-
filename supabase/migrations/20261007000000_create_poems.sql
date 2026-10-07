create table if not exists public.poems (
  id uuid primary key default gen_random_uuid(),
  poet text not null check (char_length(btrim(poet)) between 1 and 80),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  poem text not null check (char_length(btrim(poem)) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.poems enable row level security;

revoke all on public.poems from anon, authenticated;
grant select on public.poems to anon, authenticated;
grant insert on public.poems to service_role;

drop policy if exists "Poems are publicly readable" on public.poems;
create policy "Poems are publicly readable"
  on public.poems
  for select
  to anon, authenticated
  using (true);