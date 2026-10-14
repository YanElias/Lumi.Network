-- LUMI: permissão de exclusão de espaços pelo próprio dono.
-- O RLS de public.spaces já está habilitado no projeto.
-- As relações space_members e channels usam ON DELETE CASCADE; messages
-- são removidas em cascata quando os canais do espaço são removidos.

drop policy if exists "Owners can delete their own spaces" on public.spaces;
drop policy if exists "Owners can delete spaces" on public.spaces;

create policy "Owners can delete spaces"
on public.spaces
for delete
to authenticated
using ((select auth.uid()) = owner_id);
