-- Run once after 003_reel_uploads.sql. Preserves all existing content.
begin;
alter table public.quizzes add column game jsonb;
alter table public.private_items drop constraint private_items_kind_check;
alter table public.private_items add constraint private_items_kind_check check (kind in ('pod','session','result','draft','settings','notebook','exam','reminder'));
grant delete on public.posts, public.comments, public.private_items to authenticated;
create policy own_delete on public.posts for delete to authenticated using(author_id=(select auth.uid()));
create policy own_delete on public.comments for delete to authenticated using(author_id=(select auth.uid()));
create policy own_delete on public.private_items for delete to authenticated using(user_id=(select auth.uid()));

create table public.pods (
 id uuid primary key, author_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 goal text not null check(length(trim(goal)) between 1 and 500),
 minutes integer not null check(minutes between 1 and 120),
 vibe text not null check(vibe in ('Quiet focus','Practice','Explain an idea')),
 visibility text not null default 'private' check(visibility in ('public','private'))
);
create table public.pod_requests (
 pod_id uuid references public.pods(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 primary key(pod_id,user_id)
);
create index pods_author_idx on public.pods(author_id);
create index pod_requests_user_idx on public.pod_requests(user_id);
alter table public.pods enable row level security;
alter table public.pod_requests enable row level security;
revoke all on public.pods,public.pod_requests from anon,authenticated;
grant select,insert,delete on public.pods to authenticated;
grant select,insert on public.pod_requests to authenticated;
grant update(status) on public.pod_requests to authenticated;
create function public.owns_pod(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pods where id=pid and author_id=auth.uid());
$$;
create function public.joined_pod(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pod_requests where pod_id=pid and user_id=auth.uid() and status='approved');
$$;
revoke all on function public.owns_pod(uuid),public.joined_pod(uuid) from public,anon;
grant execute on function public.owns_pod(uuid),public.joined_pod(uuid) to authenticated;
create policy visible_pods on public.pods for select to authenticated using(visibility='public' or author_id=auth.uid() or public.joined_pod(id));
create policy own_insert on public.pods for insert to authenticated with check(author_id=auth.uid());
create policy own_delete on public.pods for delete to authenticated using(author_id=auth.uid());
create policy visible_requests on public.pod_requests for select to authenticated using(user_id=auth.uid() or public.owns_pod(pod_id));
create policy own_request on public.pod_requests for insert to authenticated with check(user_id=auth.uid() and status='pending' and not public.owns_pod(pod_id));
create policy owner_review on public.pod_requests for update to authenticated using(public.owns_pod(pod_id)) with check(public.owns_pod(pod_id) and status in ('approved','rejected'));
-- Private pods can be discovered by title, but their goals remain visible only to approved members.
create function public.list_pods() returns table(id uuid,author_id uuid,title text,goal text,minutes integer,vibe text,visibility text)
language sql stable security definer set search_path='' as $$
 select p.id,p.author_id,p.title,case when p.visibility='public' or p.author_id=auth.uid() or public.joined_pod(p.id) then p.goal else 'Private pod: request to join to view the goal.' end,p.minutes,p.vibe,p.visibility
 from public.pods p where auth.uid() is not null order by p.title,p.id;
$$;
revoke all on function public.list_pods() from public,anon;
grant execute on function public.list_pods() to authenticated;
-- Migrate old personal pods without deleting their backup records.
insert into public.pods(id,author_id,title,goal,minutes,vibe,visibility)
 select id::uuid,user_id,payload->>'title',payload->>'goal',(payload->>'minutes')::integer,payload->>'vibe','private'
 from public.private_items where kind='pod' on conflict(id) do nothing;

-- Store the signup category selection immediately, including email-confirmation signups.
create function public.create_signup_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare tags text[];
begin
 select coalesce(array_agg(value), '{}') into tags from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'interests','[]'::jsonb));
 if cardinality(tags) > 20 or not public.valid_tags(tags) then raise exception 'Invalid interests'; end if;
 insert into public.profiles(id,name,interests) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),80),tags) on conflict(id) do nothing;
 return new;
end; $$;
create trigger learnloop_signup_profile after insert on auth.users for each row execute function public.create_signup_profile();
-- Authenticated quota is enforced in Postgres, not in a browser or an ephemeral function instance.
create table public.ai_usage (user_id uuid references auth.users(id) on delete cascade, day date not null, requests integer not null default 0, primary key(user_id,day));
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon,authenticated;
create function public.claim_ai_generation() returns void language plpgsql security definer set search_path='' as $$
declare used integer;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into public.ai_usage(user_id,day,requests) values(auth.uid(),current_date,1)
 on conflict(user_id,day) do update set requests=public.ai_usage.requests+1 returning requests into used;
 if used>10 then raise exception 'Daily AI limit reached'; end if;
end; $$;
revoke all on function public.claim_ai_generation() from public,anon;
grant execute on function public.claim_ai_generation() to authenticated;

commit;
