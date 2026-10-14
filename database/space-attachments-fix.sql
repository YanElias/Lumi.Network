-- LUMI: corrigir leitura e remoção dos anexos dos Espaços.
-- Os arquivos continuam privados; apenas membros do espaço do canal podem ler.
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
    where c.id::text = (storage.foldername(name))[1]
      and sm.user_id = (select auth.uid())
  )
);

-- Permite remover o anexo enviado pela própria conta quando uma mensagem é apagada.
drop policy if exists "Users can delete their own space attachments" on storage.objects;
create policy "Users can delete their own space attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'space-attachments'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
