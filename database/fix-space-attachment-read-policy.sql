-- Corrige a leitura dos anexos dos Espaços.
-- A política anterior consultava channels.name em vez de storage.objects.name,
-- impedindo a geração de URLs assinadas para imagens e vídeos.
drop policy if exists "Space members can read channel media" on storage.objects;
create policy "Space members can read channel media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'space-attachments'
  and exists (
    select 1
    from public.channels c
    join public.space_members sm on sm.space_id = c.space_id
    where c.id::text = (storage.foldername(objects.name))[1]
      and sm.user_id = (select auth.uid())
  )
);
