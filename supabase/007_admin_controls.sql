-- Apply after 006. No admin is granted here; use the separate owner activation script.
begin;
create table public.app_admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.app_controls(id boolean primary key default true check(id), daily_ai_limit integer not null default 10 check(daily_ai_limit between -1 and 100000), ai_enabled boolean not null default true);
insert into public.app_controls(id) values(true);
create table public.user_controls(user_id uuid primary key references auth.users(id) on delete cascade, daily_ai_limit integer check(daily_ai_limit between -1 and 100000), restricted boolean not null default false);
create table public.admin_audit(id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null, action text not null, target text not null, details jsonb not null, reason text not null, created_at timestamptz not null default now());
alter table public.app_admins enable row level security;
alter table public.app_controls enable row level security;
alter table public.user_controls enable row level security;
alter table public.admin_audit enable row level security;
revoke all on public.app_admins,public.app_controls,public.user_controls,public.admin_audit from anon,authenticated;
create function public.is_app_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.app_admins where user_id=auth.uid());
$$;
create function public.can_contribute() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from public.user_controls where user_id=auth.uid() and restricted);
$$;
-- Restrict writes without hiding a member's own notebooks or preventing account export.
do $$ declare t text; begin
 foreach t in array array['profiles','posts','comments','reactions','bookmarks','shares','follows','quizzes','pods','pod_requests','pod_presence','pod_signals','pod_rooms','pod_answers'] loop
 execute format('create policy active_insert on public.%I as restrictive for insert to authenticated with check(public.can_contribute())',t);
 execute format('create policy active_update on public.%I as restrictive for update to authenticated using(public.can_contribute()) with check(public.can_contribute())',t);
 end loop;
end $$;
-- Hidden content is reversible. Existing owner update grants must not include this column.
alter table public.posts add column moderated boolean not null default false;
alter table public.comments add column moderated boolean not null default false;
alter table public.quizzes add column moderated boolean not null default false;
alter table public.pods add column moderated boolean not null default false;
create policy moderation_read on public.posts as restrictive for select to authenticated using(not moderated);
create policy moderation_read on public.comments as restrictive for select to authenticated using(not moderated and exists(select 1 from public.posts p where p.id=content_id));
create policy moderation_read on public.quizzes as restrictive for select to authenticated using(not moderated);
create policy moderation_read on public.pods as restrictive for select to authenticated using(not moderated);
create or replace function public.can_use_pod(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.can_contribute() and exists(select 1 from public.pods where id=pid and not moderated) and (public.owns_pod(pid) or public.joined_pod(pid));
$$;
create or replace function public.list_pods() returns table(id uuid,author_id uuid,title text,goal text,minutes integer,vibe text,visibility text)
language sql stable security definer set search_path='' as $$
 select p.id,p.author_id,p.title,case when p.visibility='public' or p.author_id=auth.uid() or public.joined_pod(p.id) then p.goal else 'Private pod: request to join to view the goal.' end,p.minutes,p.vibe,p.visibility
 from public.pods p where auth.uid() is not null and not p.moderated order by p.title,p.id;
$$;
create or replace function public.claim_ai_generation() returns void language plpgsql security definer set search_path='' as $$
declare used integer; allowance integer; enabled boolean;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if not public.can_contribute() then raise exception 'Your account is restricted. Contact the app administrator.'; end if;
 -- Lock configuration rows so changes and claims are serialized per user.
 select ai_enabled,daily_ai_limit into enabled,allowance from public.app_controls where id=true for share;
 if not enabled then raise exception 'AI is paused by the app administrator.'; end if;
 insert into public.user_controls(user_id) values(auth.uid()) on conflict do nothing;
 select coalesce(daily_ai_limit,allowance) into allowance from public.user_controls where user_id=auth.uid() for update;
 insert into public.ai_usage(user_id,day,requests) values(auth.uid(),current_date,1)
 on conflict(user_id,day) do update set requests=public.ai_usage.requests+1 returning requests into used;
 if allowance<>-1 and used>allowance then raise exception 'BTB daily AI allowance reached (% requests). Contact the app administrator or return tomorrow.',allowance; end if;
end $$;
create function public.admin_dashboard(search_text text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_app_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if length(search_text)>120 then raise exception 'Search too long'; end if;
 select jsonb_build_object(
 'settings',(select to_jsonb(s) from public.app_controls s where id=true),
 'users',coalesce((select jsonb_agg(x) from (select u.id,u.email,p.name,exists(select 1 from public.app_admins a where a.user_id=u.id) as admin,c.daily_ai_limit,coalesce(c.restricted,false) restricted,coalesce(a.requests,0) used
 from auth.users u left join public.profiles p on p.id=u.id left join public.user_controls c on c.user_id=u.id left join public.ai_usage a on a.user_id=u.id and a.day=current_date
 where concat(u.email,' ',p.name,' ',u.id) ilike '%'||search_text||'%' order by u.id limit 100) x),'[]'::jsonb),
 'content',coalesce((select jsonb_agg(x) from (select * from (
 select id,author_id,kind as kind,left(caption,300) as title,moderated from public.posts
 union all select id,author_id,'comment',left(text,300),moderated from public.comments
 union all select id,author_id,'quiz',title,moderated from public.quizzes
 union all select id,author_id,'pod',title,moderated from public.pods) c
 where concat(c.title,' ',c.author_id,' ',c.id) ilike '%'||search_text||'%' order by c.id limit 100) x),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(x) from (select * from public.admin_audit order by id desc limit 50) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
create function public.admin_change(action_name text, target_id uuid default null, value jsonb default '{}', reason_text text default '') returns void language plpgsql security definer set search_path='' as $$
declare before_value jsonb; after_value jsonb; lim integer; flag boolean; tbl text; affected integer;
begin
 if not public.is_app_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if length(trim(reason_text)) not between 3 and 500 then raise exception 'Give a reason (3–500 characters)'; end if;
 if action_name='settings' then
 lim := (value->>'daily_ai_limit')::integer; flag := (value->>'ai_enabled')::boolean;
 if lim is null or flag is null or lim not between -1 and 100000 then raise exception 'Invalid settings'; end if;
 select to_jsonb(s) into before_value from public.app_controls s where id=true for update;
 update public.app_controls set daily_ai_limit=lim,ai_enabled=flag where id=true;
 after_value:=value;
 elsif action_name in ('user','reset_usage') then
 if not exists(select 1 from auth.users where id=target_id) then raise exception 'User not found'; end if;
 insert into public.user_controls(user_id) values(target_id) on conflict do nothing;
 select to_jsonb(c) into before_value from public.user_controls c where user_id=target_id for update;
 if action_name='user' then
 lim := (value->>'daily_ai_limit')::integer; flag := (value->>'restricted')::boolean;
 if flag is null or (lim is not null and lim not between -1 and 100000) then raise exception 'Invalid user settings'; end if;
 if flag and exists(select 1 from public.app_admins where user_id=target_id) then raise exception 'Cannot restrict an administrator'; end if;
 update public.user_controls set daily_ai_limit=lim,restricted=flag where user_id=target_id;
 after_value:=value;
 else
 select jsonb_build_object('requests',coalesce((select requests from public.ai_usage where user_id=target_id and day=current_date),0)) into before_value;
 update public.ai_usage set requests=0 where user_id=target_id and day=current_date;
 after_value:='{"requests":0}';
 end if;
 elsif action_name='moderate' then
 tbl := case value->>'kind' when 'post' then 'posts' when 'reel' then 'posts' when 'comment' then 'comments' when 'quiz' then 'quizzes' when 'pod' then 'pods' else null end;
 flag := (value->>'hidden')::boolean;
 if tbl is null or flag is null then raise exception 'Invalid content action'; end if;
 execute format('select jsonb_build_object(''hidden'',moderated) from public.%I where id=$1 for update',tbl) into before_value using target_id;
 execute format('update public.%I set moderated=$1 where id=$2',tbl) using flag,target_id;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Content not found'; end if;
 after_value:=value;
 else raise exception 'Unknown admin action'; end if;
 insert into public.admin_audit(actor_id,action,target,details,reason) values(auth.uid(),action_name,coalesce(target_id::text,'app'),jsonb_build_object('before',before_value,'after',after_value),trim(reason_text));
end $$;
revoke all on function public.is_app_admin(),public.can_contribute(),public.admin_dashboard(text),public.admin_change(text,uuid,jsonb,text) from public,anon;
grant execute on function public.is_app_admin(),public.can_contribute(),public.admin_dashboard(text),public.admin_change(text,uuid,jsonb,text) to authenticated;
-- No browser can mutate the admin roster or erase its audit trail.
commit;
