-- LUMI · pacote de recursos adicionais
-- Execute no SQL Editor do Supabase depois das migrações de DMs e perfil.
-- Não remove dados existentes.

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists status_text text not null default '';
alter table public.profiles add column if not exists activity_text text not null default '';
alter table public.profiles add column if not exists do_not_disturb boolean not null default false;
alter table public.profiles add column if not exists vip_purchased boolean not null default false;

alter table public.profiles drop constraint if exists profiles_bio_length_check;
alter table public.profiles add constraint profiles_bio_length_check check (char_length(bio) <= 160);
alter table public.profiles drop constraint if exists profiles_status_text_length_check;
alter table public.profiles add constraint profiles_status_text_length_check check (char_length(status_text) <= 80);
alter table public.profiles drop constraint if exists profiles_activity_text_length_check;
alter table public.profiles add constraint profiles_activity_text_length_check check (char_length(activity_text) <= 100);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists "Users can view their own blocks" on public.user_blocks;
create policy "Users can view their own blocks" on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "Users can block people" on public.user_blocks;
create policy "Users can block people" on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "Users can unblock people" on public.user_blocks;
create policy "Users can unblock people" on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());

-- Impede criar novas DMs se qualquer lado bloqueou o outro.
create or replace function public.start_direct_conversation(p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_conversation_id uuid;
begin
  if v_me is null then raise exception 'Você precisa entrar na sua conta.'; end if;
  if p_user_id is null or p_user_id = v_me then raise exception 'Escolha outra pessoa para conversar.'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then raise exception 'Essa conta não existe.'; end if;
  if exists (select 1 from public.user_blocks b where (b.blocker_id=v_me and b.blocked_id=p_user_id) or (b.blocker_id=p_user_id and b.blocked_id=v_me)) then
    raise exception 'Não é possível iniciar esta conversa porque existe um bloqueio entre as contas.';
  end if;
  v_a := least(v_me, p_user_id); v_b := greatest(v_me, p_user_id);
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

-- Função SECURITY DEFINER para verificar bloqueios dos dois lados mesmo com RLS.
create or replace function public.lumi_users_blocked(p_user_a uuid, p_user_b uuid)
returns boolean language sql stable security definer set search_path = '' as $
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id=p_user_a and b.blocked_id=p_user_b)
       or (b.blocker_id=p_user_b and b.blocked_id=p_user_a)
  );
$;
revoke all on function public.lumi_users_blocked(uuid,uuid) from public;
grant execute on function public.lumi_users_blocked(uuid,uuid) to authenticated;

-- Usuários bloqueados não podem enviar mensagens na conversa existente.
drop policy if exists "Participants can send their own direct messages" on public.direct_messages;
create policy "Participants can send their own direct messages" on public.direct_messages
for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from public.conversation_members cm where cm.conversation_id=direct_messages.conversation_id and cm.user_id=auth.uid())
  and not exists (
    select 1 from public.conversation_members mine
    join public.conversation_members theirs on theirs.conversation_id=mine.conversation_id and theirs.user_id<>mine.user_id
    where mine.conversation_id=direct_messages.conversation_id and mine.user_id=auth.uid()
      and public.lumi_users_blocked(mine.user_id,theirs.user_id)
  )
);

-- Realtime de perfil para que preferências/status possam ser sincronizados.
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; when undefined_object then null; end $$;
notify pgrst, 'reload schema';
