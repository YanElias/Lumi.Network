-- LUMI · banco inicial para Supabase
-- Cole este arquivo no SQL Editor do seu projeto Supabase e execute.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'Pessoa LUMI',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 48),
  description text not null default '',
  symbol text not null default '✳',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8)),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  topic text not null default '',
  kind text not null default 'text' check (kind in ('text')),
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (space_id, name)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_space_members_user on public.space_members(user_id);
create index if not exists idx_channels_space_position on public.channels(space_id, position);
create index if not exists idx_messages_channel_created on public.messages(channel_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(regexp_replace(split_part(coalesce(new.email, 'pessoa'), '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || substr(new.id::text, 1, 5),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Pessoa LUMI'), '@', 1))
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.create_default_channel()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.channels (space_id, name, topic, position, created_by)
  values (new.id, 'geral', 'O começo de todas as conversas.', 0, new.owner_id)
  on conflict (space_id, name) do nothing;
  insert into public.space_members (space_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (space_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_space_created on public.spaces;
create trigger on_space_created after insert on public.spaces for each row execute procedure public.create_default_channel();

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles visible to authenticated users" on public.profiles;
create policy "Profiles visible to authenticated users" on public.profiles for select to authenticated using (true);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Espaços públicos para descoberta; espaços são abertos neste primeiro MVP.
drop policy if exists "Authenticated users can discover spaces" on public.spaces;
create policy "Authenticated users can discover spaces" on public.spaces for select to authenticated using (true);
drop policy if exists "Users can create spaces" on public.spaces;
create policy "Users can create spaces" on public.spaces for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Owners can update spaces" on public.spaces;
create policy "Owners can update spaces" on public.spaces for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners can delete spaces" on public.spaces;
create policy "Owners can delete spaces" on public.spaces for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Members list visible to authenticated users" on public.space_members;
create policy "Members list visible to authenticated users" on public.space_members for select to authenticated using (true);
drop policy if exists "Users can join spaces by invite" on public.space_members;
create policy "Users can join spaces by invite" on public.space_members for insert to authenticated with check (auth.uid() = user_id and role = 'member');
drop policy if exists "Users can leave spaces" on public.space_members;
create policy "Users can leave spaces" on public.space_members for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Channels visible to authenticated users" on public.channels;
create policy "Channels visible to space members" on public.channels for select to authenticated using (exists (select 1 from public.space_members sm where sm.space_id = channels.space_id and sm.user_id = auth.uid()));
drop policy if exists "Space members can create channels" on public.channels;
create policy "Space members can create channels" on public.channels for insert to authenticated with check (exists (select 1 from public.space_members sm where sm.space_id = channels.space_id and sm.user_id = auth.uid() and sm.role in ('owner','admin')));
drop policy if exists "Space owners can update channels" on public.channels;
create policy "Space owners can update channels" on public.channels for update to authenticated using (exists (select 1 from public.space_members sm where sm.space_id = channels.space_id and sm.user_id = auth.uid() and sm.role in ('owner','admin')));
drop policy if exists "Space owners can delete channels" on public.channels;
create policy "Space owners can delete channels" on public.channels for delete to authenticated using (exists (select 1 from public.space_members sm where sm.space_id = channels.space_id and sm.user_id = auth.uid() and sm.role in ('owner','admin')));

drop policy if exists "Messages visible to authenticated users" on public.messages;
create policy "Messages visible to space members" on public.messages for select to authenticated using (exists (select 1 from public.channels c join public.space_members sm on sm.space_id = c.space_id where c.id = messages.channel_id and sm.user_id = auth.uid()));
drop policy if exists "Users can send messages as themselves" on public.messages;
create policy "Users can send messages as themselves" on public.messages for insert to authenticated with check (auth.uid() = author_id and exists (select 1 from public.channels c join public.space_members sm on sm.space_id = c.space_id where c.id = messages.channel_id and sm.user_id = auth.uid()));
drop policy if exists "Authors can delete their messages" on public.messages;
create policy "Authors can delete their messages" on public.messages for delete to authenticated using (auth.uid() = author_id);

-- Ative Realtime para novas mensagens.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
when others then null;
end $$;
