begin;
create table public.comment_likes(comment_id uuid references public.comments(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,primary key(comment_id,user_id));
alter table public.comment_likes enable row level security;
revoke all on public.comment_likes from anon,authenticated;
grant select,insert,delete on public.comment_likes to authenticated;
create policy visible_likes on public.comment_likes for select to authenticated using(exists(select 1 from public.comments c where c.id=comment_id));
create policy own_like on public.comment_likes for insert to authenticated with check(user_id=auth.uid() and public.can_contribute() and exists(select 1 from public.comments c where c.id=comment_id));
create policy own_unlike on public.comment_likes for delete to authenticated using(user_id=auth.uid());
commit;
