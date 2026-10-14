-- LUMI: permite enviar fotos/vídeos sem texto nos canais dos Espaços.
-- Mensagens com texto continuam limitadas a 4.000 caracteres.
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check check (
  content is not null and (
    char_length(content) between 1 and 4000
    or (char_length(content) = 0 and attachment_path is not null)
  )
);
