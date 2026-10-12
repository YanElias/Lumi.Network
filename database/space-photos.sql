-- LUMI: fotos de espaços. Execute no SQL Editor do Supabase.
alter table public.spaces
  add column if not exists image_url text;

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values (
  'space-photos', 'space-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "LUMI space photo owner update" on public.spaces;
create policy "LUMI space photo owner update"
on public.spaces for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "LUMI space photo upload" on storage.objects;
create policy "LUMI space photo upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'space-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.spaces s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = auth.uid()
  )
);

drop policy if exists "LUMI space photo public read" on storage.objects;
create policy "LUMI space photo public read"
on storage.objects for select to public
using (bucket_id = 'space-photos');
