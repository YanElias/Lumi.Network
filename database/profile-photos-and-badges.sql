-- LUMI: fotos de perfil e armazenamento seguro.
-- Execute no SQL Editor do Supabase antes de usar o envio de fotos.

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- Cada pessoa só pode enviar/substituir arquivos dentro da própria pasta (UUID do usuário).
drop policy if exists "Users upload own profile photos" on storage.objects;
create policy "Users upload own profile photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own profile photos" on storage.objects;
create policy "Users update own profile photos"
on storage.objects for update to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own profile photos" on storage.objects;
create policy "Users delete own profile photos"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura pública apenas para o bucket de fotos de perfil.
drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable"
on storage.objects for select to public
using (bucket_id = 'profile-photos');
