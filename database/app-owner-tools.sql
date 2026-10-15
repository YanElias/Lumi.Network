-- LUMI: ferramentas oficiais do dono (comunicados globais)
-- Execute uma vez no Supabase SQL Editor. Não remove nem altera dados existentes.
create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 1 and 240),
  created_by uuid not null references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists app_announcements_active_created_idx
  on public.app_announcements (is_active, created_at desc);
alter table public.app_announcements enable row level security;
drop policy if exists "Everyone can read active LUMI announcements" on public.app_announcements;
create policy "Everyone can read active LUMI announcements"
  on public.app_announcements for select to authenticated
  using (is_active = true or auth.uid() = '222eba63-627c-4cc9-bf49-09da8cb7550d'::uuid);
drop policy if exists "Only LUMI owner can publish announcements" on public.app_announcements;
create policy "Only LUMI owner can publish announcements"
  on public.app_announcements for insert to authenticated
  with check (auth.uid() = '222eba63-627c-4cc9-bf49-09da8cb7550d'::uuid and created_by = auth.uid());
drop policy if exists "Only LUMI owner can update announcements" on public.app_announcements;
create policy "Only LUMI owner can update announcements"
  on public.app_announcements for update to authenticated
  using (auth.uid() = '222eba63-627c-4cc9-bf49-09da8cb7550d'::uuid)
  with check (auth.uid() = '222eba63-627c-4cc9-bf49-09da8cb7550d'::uuid);
drop policy if exists "Only LUMI owner can delete announcements" on public.app_announcements;
create policy "Only LUMI owner can delete announcements"
  on public.app_announcements for delete to authenticated
  using (auth.uid() = '222eba63-627c-4cc9-bf49-09da8cb7550d'::uuid);
