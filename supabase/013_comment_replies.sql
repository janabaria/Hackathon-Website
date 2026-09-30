-- Keep replies on the same post/reel. Existing ownership/RLS policies remain in force.
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete set null;
create index if not exists comments_parent_idx on public.comments(parent_id);
create or replace function public.validate_comment_parent() returns trigger language plpgsql set search_path = public as $$
begin
  if new.parent_id is not null and (new.parent_id = new.id or not exists (select 1 from public.comments c where c.id = new.parent_id and c.content_id = new.content_id)) then
    raise exception 'Reply must refer to a comment on the same content';
  end if;
  return new;
end; $$;
drop trigger if exists comment_parent_check on public.comments;
create trigger comment_parent_check before insert or update of parent_id on public.comments for each row execute function public.validate_comment_parent();
