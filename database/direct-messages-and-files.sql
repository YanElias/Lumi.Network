-- LUMI: mensagens diretas privadas + anexos privados
-- Execute uma vez no Supabase > SQL Editor, conectado como administrador.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_participants check (participant_a <> participant_b),
  constraint conversations_pair_unique unique (participant_a, participant_b)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 4000),
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz not null default now(),
  constraint dm_has_content_or_attachment check (char_length(trim(content)) > 0 or attachment_path is not null),
  constraint dm_attachment_metadata check (
    (attachment_path is null and attachment_name is null and attachment_type is null and attachment_size is null)
    or (attachment_path is not null and attachment_name is not null and attachment_size between 1 and 20971520)
  )
);

create index if not exists idx_conversation_members_user on public.conversation_members(user_id, joined_at desc);
create index if not exists idx_direct_messages_conversation_created on public.direct_messages(conversation_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "Members can view their conversations" on public.conversations;
create policy "Members can view their conversations" on public.conversations
  for select to authenticated using (participant_a = auth.uid() or participant_b = auth.uid());

drop policy if exists "Users can view their own conversation memberships" on public.conversation_members;
create policy "Users can view their own conversation memberships" on public.conversation_members
  for select to authenticated using (exists (
    select 1 from public.conversations c where c.id = conversation_members.conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
  ));

drop policy if exists "Participants can read direct messages" on public.direct_messages;
create policy "Participants can read direct messages" on public.direct_messages
  for select to authenticated using (exists (
    select 1 from public.conversation_members cm where cm.conversation_id = direct_messages.conversation_id and cm.user_id = auth.uid()
  ));

drop policy if exists "Participants can send their own direct messages" on public.direct_messages;
create policy "Participants can send their own direct messages" on public.direct_messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversation_members cm where cm.conversation_id = direct_messages.conversation_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Authors can delete their direct messages" on public.direct_messages;
create policy "Authors can delete their direct messages" on public.direct_messages
  for delete to authenticated using (sender_id = auth.uid());

create or replace function public.start_direct_conversation(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_conversation_id uuid;
begin
  if v_me is null then raise exception 'Você precisa entrar na sua conta.'; end if;
  if p_user_id is null or p_user_id = v_me then raise exception 'Escolha outra pessoa para conversar.'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then raise exception 'Essa conta não existe.'; end if;
  v_a := least(v_me, p_user_id);
  v_b := greatest(v_me, p_user_id);

  insert into public.conversations(participant_a, participant_b, created_by)
  values (v_a, v_b, v_me)
  on conflict (participant_a, participant_b) do update set participant_a = excluded.participant_a
  returning id into v_conversation_id;

  insert into public.conversation_members(conversation_id, user_id)
  values (v_conversation_id, v_a), (v_conversation_id, v_b)
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation_id;
end;
$$;
revoke all on function public.start_direct_conversation(uuid) from public;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

-- Bucket privado. Anexos não ficam acessíveis publicamente; o app gera links temporários.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('dm-attachments', 'dm-attachments', false, 20971520, null)
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists "DM participants can upload attachments" on storage.objects;
create policy "DM participants can upload attachments" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'dm-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id::text = (storage.foldername(name))[1] and cm.user_id = auth.uid()
    )
  );

drop policy if exists "DM participants can read attachments" on storage.objects;
create policy "DM participants can read attachments" on storage.objects
  for select to authenticated using (
    bucket_id = 'dm-attachments'
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id::text = (storage.foldername(name))[1] and cm.user_id = auth.uid()
    )
  );

-- Permite que o cliente receba eventos em tempo real para as DMs.
do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
