-- LUMI v12: anexos em canais, edição/exclusão de mensagens, respostas e reações.
-- Execute no Supabase > SQL Editor depois dos SQLs anteriores do LUMI.
-- Não apaga mensagens existentes.

alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_size bigint;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists reply_to uuid references public.messages(id) on delete set null;

-- Permite mensagens somente com anexo, sem texto.
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check
  check (char_length(content) between 0 and 4000 and (char_length(content) > 0 or attachment_path is not null));

-- Cada pessoa pode editar/apagar somente suas mensagens.
drop policy if exists "Authors can edit their own messages" on public.messages;
create policy "Authors can edit their own messages" on public.messages for update to authenticated
using (author_id = auth.uid() and exists (
  select 1 from public.channels c where c.id = messages.channel_id
  and public.lumi_has_space_role(c.space_id, array['owner','admin','member'])
)) with check (author_id = auth.uid());

drop policy if exists "Authors can delete their own messages" on public.messages;
create policy "Authors can delete their own messages" on public.messages for delete to authenticated
using (author_id = auth.uid() and exists (
  select 1 from public.channels c where c.id = messages.channel_id
  and public.lumi_has_space_role(c.space_id, array['owner','admin','member'])
));

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
alter table public.message_reactions enable row level security;
drop policy if exists "Space members can see message reactions" on public.message_reactions;
create policy "Space members can see message reactions" on public.message_reactions for select to authenticated using (
  exists (select 1 from public.messages m join public.channels c on c.id=m.channel_id
    where m.id=message_reactions.message_id and public.lumi_has_space_role(c.space_id,array['owner','admin','member']))
);
drop policy if exists "Members can add their own reactions" on public.message_reactions;
create policy "Members can add their own reactions" on public.message_reactions for insert to authenticated with check (
  user_id=auth.uid() and exists (select 1 from public.messages m join public.channels c on c.id=m.channel_id
    where m.id=message_reactions.message_id and public.lumi_has_space_role(c.space_id,array['owner','admin','member']))
);
drop policy if exists "Members can remove their own reactions" on public.message_reactions;
create policy "Members can remove their own reactions" on public.message_reactions for delete to authenticated using (user_id=auth.uid());

-- Armazenamento privado para fotos e vídeos dos canais (máx. 30 MB por arquivo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('space-attachments','space-attachments',false,31457280,array['image/*','video/*'])
on conflict (id) do update set public=false, file_size_limit=31457280, allowed_mime_types=array['image/*','video/*'];

drop policy if exists "Space members upload channel media" on storage.objects;
create policy "Space members upload channel media" on storage.objects for insert to authenticated with check (
  bucket_id='space-attachments' and (storage.foldername(name))[2]=auth.uid()::text
  and exists (select 1 from public.channels c where c.id::text=(storage.foldername(name))[1]
    and public.lumi_has_space_role(c.space_id,array['owner','admin','member']))
);
drop policy if exists "Space members view channel media" on storage.objects;
create policy "Space members view channel media" on storage.objects for select to authenticated using (
  bucket_id='space-attachments' and exists (select 1 from public.channels c where c.id::text=(storage.foldername(name))[1]
    and public.lumi_has_space_role(c.space_id,array['owner','admin','member']))
);
drop policy if exists "Owners can delete their channel media" on storage.objects;
create policy "Owners can delete their channel media" on storage.objects for delete to authenticated using (
  bucket_id='space-attachments' and (storage.foldername(name))[2]=auth.uid()::text
);

do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null; when others then null; end $$;
