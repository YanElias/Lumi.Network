-- LUMI: controles de dono para exclusão de espaços
-- Execute no SQL Editor do Supabase. Esta política permite que o dono autenticado exclua o próprio espaço.
alter table public.spaces enable row level security;

drop policy if exists "Owners can delete their own spaces" on public.spaces;
create policy "Owners can delete their own spaces"
on public.spaces
for delete
to authenticated
using (owner_id = (select auth.uid()));

-- A exclusão depende de as relações filhas (canais, mensagens e membros)
-- usarem ON DELETE CASCADE. Se o Supabase informar violação de chave estrangeira,
-- revise essas chaves antes de alterar; não apague dados manualmente sem backup.
