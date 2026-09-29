-- Run after 007 in the trusted Supabase SQL Editor, after confirming the owner email.
-- Matches a verified auth account once; access is attached to its UUID, not editable metadata.
begin;
do $$ declare owner_id uuid; matches integer; begin
 select count(*) into matches from auth.users where lower(email)='mhamedmohamad3@gmail.com' and email_confirmed_at is not null;
 if matches<>1 then raise exception 'Expected exactly one verified account for mhamedmohamad3@gmail.com; no access granted'; end if;
 select id into owner_id from auth.users where lower(email)='mhamedmohamad3@gmail.com' and email_confirmed_at is not null;
 insert into public.app_admins(user_id) values(owner_id) on conflict do nothing;
 insert into public.user_controls(user_id,daily_ai_limit) values(owner_id,-1) on conflict(user_id) do update set daily_ai_limit=-1;
 insert into public.admin_audit(actor_id,action,target,details,reason) values(owner_id,'owner_activation',owner_id::text,'{"app_ai_limit":"unlimited"}','Owner explicitly requested admin access and limit controls');
end $$;
commit;
