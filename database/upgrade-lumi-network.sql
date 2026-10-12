-- LUMI Network · atualização para projetos já existentes
-- Execute este arquivo no Supabase SQL Editor. Não apaga dados existentes.

-- 1) Garantir que novos usuários ganhem um perfil automaticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_username text;
begin
  safe_username := lower(regexp_replace(split_part(coalesce(new.email, 'pessoa'), '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || substr(new.id::text, 1, 5);
  insert into public.profiles as existing (id, username, display_name)
  values (
    new.id,
    safe_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(coalesce(new.email, 'Pessoa LUMI'), '@', 1), ''), 'Pessoa LUMI')
  )
  on conflict (id) do update set
    username = coalesce(existing.username, excluded.username),
    display_name = coalesce(nullif(existing.display_name, ''), excluded.display_name);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Completar perfis antigos que ainda estejam faltando.
insert into public.profiles (id, username, display_name)
select u.id,
       'user_' || replace(u.id::text, '-', ''),
       coalesce(nullif(u.raw_user_meta_data->>'display_name',''), nullif(split_part(coalesce(u.email,''),'@',1),''), 'Novo usuário')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 2) Função para garantir canal #geral e membro proprietário nos espaços já existentes.
insert into public.space_members (space_id, user_id, role)
select s.id, s.owner_id, 'owner'
from public.spaces s
where not exists (select 1 from public.space_members sm where sm.space_id=s.id and sm.user_id=s.owner_id)
on conflict (space_id,user_id) do nothing;
insert into public.channels (space_id,name,topic,position,created_by)
select s.id,'geral','O começo de todas as conversas.',0,s.owner_id
from public.spaces s
where not exists (select 1 from public.channels c where c.space_id=s.id and c.name='geral')
on conflict (space_id,name) do nothing;

-- Helper: checa papel sem provocar recursão nas políticas de RLS.
create or replace function public.lumi_has_space_role(p_space_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.space_members sm
    where sm.space_id = p_space_id and sm.user_id = auth.uid() and sm.role = any(p_roles)
  );
$$;
revoke all on function public.lumi_has_space_role(uuid,text[]) from public;
grant execute on function public.lumi_has_space_role(uuid,text[]) to authenticated;

-- 3) Entrar usando código de convite, sem confiar no cliente para escolher o espaço.
create or replace function public.join_space_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_space uuid;
begin
  if auth.uid() is null then raise exception 'Você precisa entrar na sua conta.'; end if;
  select s.id into target_space from public.spaces s where upper(s.invite_code)=upper(trim(p_code)) limit 1;
  if target_space is null then raise exception 'Código de convite inválido.'; end if;
  insert into public.space_members(space_id,user_id,role) values(target_space,auth.uid(),'member')
  on conflict(space_id,user_id) do nothing;
  return target_space;
end;
$$;
revoke all on function public.join_space_by_code(text) from public;
grant execute on function public.join_space_by_code(text) to authenticated;

-- 4) Gerenciar papéis: somente owner/admin; admin não pode promover alguém a owner/admin.
create or replace function public.set_space_member_role(p_space_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_role text; target_role text;
begin
  if auth.uid() is null then raise exception 'Você precisa entrar na sua conta.'; end if;
  if p_role not in ('admin','member') then raise exception 'Papel inválido.'; end if;
  select role into actor_role from public.space_members where space_id=p_space_id and user_id=auth.uid();
  select role into target_role from public.space_members where space_id=p_space_id and user_id=p_user_id;
  if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Somente donos e administradores podem gerenciar membros.'; end if;
  if target_role is null then raise exception 'Membro não encontrado.'; end if;
  if actor_role='admin' and (p_role='admin' or target_role in ('owner','admin')) then raise exception 'Administradores só podem alterar membros comuns.'; end if;
  if target_role='owner' then raise exception 'O dono do espaço não pode ser rebaixado por esta ação.'; end if;
  update public.space_members set role=p_role where space_id=p_space_id and user_id=p_user_id;
end;
$$;
revoke all on function public.set_space_member_role(uuid,uuid,text) from public;
grant execute on function public.set_space_member_role(uuid,uuid,text) to authenticated;

-- 5) Policies para membros/canais/mensagens e papéis.
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Members list visible to authenticated users" on public.space_members;
drop policy if exists "Users can join spaces by invite" on public.space_members;
drop policy if exists "Users can leave spaces" on public.space_members;
drop policy if exists "Managers can manage memberships" on public.space_members;
create policy "Members can view memberships in their spaces" on public.space_members for select to authenticated using (user_id=auth.uid() or public.lumi_has_space_role(space_id,array['owner','admin','member']));
create policy "Users can leave their memberships" on public.space_members for delete to authenticated using (user_id=auth.uid() and role <> 'owner');
create policy "Owners and admins can remove members" on public.space_members for delete to authenticated using (public.lumi_has_space_role(space_id,array['owner','admin']) and role <> 'owner' and (public.lumi_has_space_role(space_id,array['owner']) or role='member'));

drop policy if exists "Channels visible to space members" on public.channels;
drop policy if exists "Space members can create channels" on public.channels;
drop policy if exists "Space owners can update channels" on public.channels;
drop policy if exists "Space owners can delete channels" on public.channels;
create policy "Channels visible to space members" on public.channels for select to authenticated using (public.lumi_has_space_role(space_id,array['owner','admin','member']));
create policy "Managers can create channels" on public.channels for insert to authenticated with check (public.lumi_has_space_role(space_id,array['owner','admin']));
create policy "Managers can update channels" on public.channels for update to authenticated using (public.lumi_has_space_role(space_id,array['owner','admin'])) with check (public.lumi_has_space_role(space_id,array['owner','admin']));
create policy "Managers can delete channels" on public.channels for delete to authenticated using (public.lumi_has_space_role(space_id,array['owner','admin']));

drop policy if exists "Messages visible to space members" on public.messages;
drop policy if exists "Users can send messages as themselves" on public.messages;
create policy "Messages visible to space members" on public.messages for select to authenticated using (exists (select 1 from public.channels c where c.id=messages.channel_id and public.lumi_has_space_role(c.space_id,array['owner','admin','member'])));
create policy "Members can send messages as themselves" on public.messages for insert to authenticated with check (auth.uid()=author_id and exists (select 1 from public.channels c where c.id=messages.channel_id and public.lumi_has_space_role(c.space_id,array['owner','admin','member'])));

-- Supabase Realtime: permite que novas mensagens cheguem sem atualizar a página.
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; when others then null; end $$;
