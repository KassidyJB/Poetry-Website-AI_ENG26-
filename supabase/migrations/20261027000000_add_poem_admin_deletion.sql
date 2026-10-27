create table public.poem_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.poem_admins enable row level security;

revoke all on public.poem_admins from anon, authenticated;
grant select on public.poem_admins to authenticated;

create policy "Admins can read their own allow-list entry"
  on public.poem_admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

grant delete on public.poems to authenticated;

create policy "Allow-listed admins can delete poems"
  on public.poems
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.poem_admins as admins
      where admins.user_id = (select auth.uid())
    )
  );
