create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_no_self check (sender_id <> recipient_id)
);
create unique index if not exists friend_requests_pair_unique
  on public.friend_requests (least(sender_id, recipient_id), greatest(sender_id, recipient_id))
  where status in ('pending','accepted');
create index if not exists friend_requests_recipient_status_idx
  on public.friend_requests (recipient_id, status, created_at desc);
create index if not exists friend_requests_sender_status_idx
  on public.friend_requests (sender_id, status, created_at desc);
alter table public.friend_requests enable row level security;
drop policy if exists "Users can read their friend requests" on public.friend_requests;
create policy "Users can read their friend requests" on public.friend_requests for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests" on public.friend_requests for insert to authenticated
  with check ((select auth.uid()) = sender_id and sender_id <> recipient_id and status = 'pending');
drop policy if exists "Participants can remove friend requests" on public.friend_requests;
create policy "Participants can remove friend requests" on public.friend_requests for delete to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
create or replace function public.respond_to_friend_request(p_request_id uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare changed_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.friend_requests
  set status = case when p_accept then 'accepted' else 'rejected' end, updated_at = now()
  where id = p_request_id and recipient_id = auth.uid() and status = 'pending';
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
