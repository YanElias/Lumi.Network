-- LUMI · campos de perfil para as configurações
-- Seguro para bancos existentes: adiciona somente a coluna bio.
alter table public.profiles
  add column if not exists bio text not null default '';

alter table public.profiles
  drop constraint if exists profiles_bio_length_check;

alter table public.profiles
  add constraint profiles_bio_length_check
  check (char_length(bio) <= 160);
