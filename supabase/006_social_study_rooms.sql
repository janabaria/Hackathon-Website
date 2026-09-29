-- Profile photos and shared study rooms. Apply after 005. Existing content is preserved.
begin;
alter table public.profiles add column if not exists avatar text not null default '' check(octet_length(avatar)<=1500000 and (avatar='' or avatar ~* '^https?://' or avatar ~* '^data:image/(png|jpeg|webp|gif);base64,'));
create or replace function public.can_use_pod(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.owns_pod(pid) or public.joined_pod(pid));
$$;
revoke all on function public.can_use_pod(uuid) from public,anon;
grant execute on function public.can_use_pod(uuid) to authenticated;
create table public.pod_presence (
 id uuid primary key, pod_id uuid not null references public.pods(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 in_call boolean not null default false, joined_at timestamptz not null default now(), seen_at timestamptz not null default now()
);
create index pod_presence_room on public.pod_presence(pod_id,seen_at);
create table public.pod_signals (
 id uuid primary key default gen_random_uuid(), pod_id uuid not null references public.pods(id) on delete cascade,
 sender_id uuid not null references public.pod_presence(id) on delete cascade,
 recipient_id uuid not null references public.pod_presence(id) on delete cascade,
 body jsonb not null check(octet_length(body::text)<=40000), created_at timestamptz not null default now()
);
create index pod_signal_recipient on public.pod_signals(recipient_id,created_at);
create table public.pod_rooms (
 pod_id uuid primary key references public.pods(id) on delete cascade,
 run_id uuid not null default gen_random_uuid(), quiz_id uuid references public.quizzes(id) on delete set null,
 mode text not null default 'quiz' check(mode in ('quiz','blocks')),
 question_index integer not null default 0 check(question_index between 0 and 19),
 phase text not null default 'lobby' check(phase in ('lobby','question','revealed','finished'))
);
create table public.pod_answers (
 pod_id uuid not null references public.pods(id) on delete cascade, run_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade, question_index integer not null check(question_index between 0 and 19),
 choice integer not null check(choice between 0 and 3), primary key(pod_id,run_id,user_id,question_index)
);
alter table public.pod_presence enable row level security;
alter table public.pod_signals enable row level security;
alter table public.pod_rooms enable row level security;
alter table public.pod_answers enable row level security;
revoke all on public.pod_presence,public.pod_signals,public.pod_rooms,public.pod_answers from anon,authenticated;
grant select,insert,delete on public.pod_presence to authenticated;
grant update(seen_at,in_call) on public.pod_presence to authenticated;
grant select,insert,delete on public.pod_signals to authenticated;
grant select,insert,update on public.pod_rooms to authenticated;
grant select,insert on public.pod_answers to authenticated;
create policy room_presence_read on public.pod_presence for select to authenticated using(public.can_use_pod(pod_id));
create policy room_presence_add on public.pod_presence for insert to authenticated with check(user_id=auth.uid() and public.can_use_pod(pod_id));
create policy room_presence_update on public.pod_presence for update to authenticated using(user_id=auth.uid() and public.can_use_pod(pod_id)) with check(user_id=auth.uid() and public.can_use_pod(pod_id));
create policy room_presence_delete on public.pod_presence for delete to authenticated using(user_id=auth.uid());
create policy room_signals_read on public.pod_signals for select to authenticated using(public.can_use_pod(pod_id) and exists(select 1 from public.pod_presence p where p.id=recipient_id and p.user_id=auth.uid()));
create policy room_signals_add on public.pod_signals for insert to authenticated with check(public.can_use_pod(pod_id) and exists(select 1 from public.pod_presence p where p.id=sender_id and p.user_id=auth.uid() and p.pod_id=pod_signals.pod_id) and exists(select 1 from public.pod_presence p where p.id=recipient_id and p.pod_id=pod_signals.pod_id));
create policy room_signals_delete on public.pod_signals for delete to authenticated using(exists(select 1 from public.pod_presence p where p.id in (sender_id,recipient_id) and p.user_id=auth.uid()));
create policy room_state_read on public.pod_rooms for select to authenticated using(public.can_use_pod(pod_id));
create policy room_state_add on public.pod_rooms for insert to authenticated with check(public.owns_pod(pod_id));
create policy room_state_update on public.pod_rooms for update to authenticated using(public.owns_pod(pod_id)) with check(public.owns_pod(pod_id));
create policy room_answers_read on public.pod_answers for select to authenticated using(public.can_use_pod(pod_id));
create policy room_answers_add on public.pod_answers for insert to authenticated with check(user_id=auth.uid() and public.can_use_pod(pod_id) and exists(select 1 from public.pod_rooms r join public.quizzes q on q.id=r.quiz_id where r.pod_id=pod_answers.pod_id and r.run_id=pod_answers.run_id and r.question_index=pod_answers.question_index and r.phase='question' and jsonb_array_length(q.questions)>pod_answers.question_index));
-- Retain only recent connection records; stale connections never count as online.
create function public.prune_pod_connections(pid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.can_use_pod(pid) then raise exception 'Join this pod first'; end if;
 delete from public.pod_signals where pod_id=pid and created_at<now()-interval '2 minutes';
 delete from public.pod_presence where pod_id=pid and seen_at<now()-interval '2 minutes';
end; $$;
revoke all on function public.prune_pod_connections(uuid) from public,anon;
grant execute on function public.prune_pod_connections(uuid) to authenticated;
commit;
