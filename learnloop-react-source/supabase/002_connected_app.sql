-- Run after schema.sql. Existing profiles and posts are preserved.
begin;
alter table public.posts add column kind text not null default 'post' check (kind in ('post','reel'));
alter table public.posts add column image text not null default '' check (octet_length(image) <= 1500000);
alter table public.posts add column title text not null default '' check (char_length(title) <= 120);
alter table public.posts add column video_url text not null default '';
alter table public.posts add constraint reel_video_valid check (kind <> 'reel' or (video_url ~* '^https?://' and length(title) > 0));

create table public.comments (
 id uuid primary key, content_id uuid not null references public.posts(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 text text not null check (char_length(trim(text)) between 1 and 500), created_at timestamptz not null default now()
);
create table public.reactions (
 content_id uuid references public.posts(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 primary key(content_id,user_id)
);
create table public.bookmarks (
 content_id uuid references public.posts(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 primary key(content_id,user_id)
);
create table public.shares (
 id uuid primary key default gen_random_uuid(), content_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade
);
create table public.follows (
 user_id uuid references public.profiles(id) on delete cascade, target_id uuid references public.profiles(id) on delete cascade,
 primary key(user_id,target_id), check(user_id <> target_id)
);
create table public.quizzes (
 id uuid primary key, author_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 1 and 120),
 topic text not null check (char_length(trim(topic)) between 1 and 120),
 difficulty text not null check (difficulty in ('Beginner','Intermediate','Advanced')),
 questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 20 and octet_length(questions::text) <= 100000)
);
-- One row per private item prevents a draft save from overwriting progress.
create table public.private_items (
 user_id uuid references auth.users(id) on delete cascade, kind text check (kind in ('pod','session','result','draft','settings')),
 id text not null, payload jsonb not null check (octet_length(payload::text) <= 100000), primary key(user_id,kind,id)
);
create index comments_content_idx on public.comments(content_id);
create index comments_author_idx on public.comments(author_id);
create index reactions_user_idx on public.reactions(user_id);
create index bookmarks_user_idx on public.bookmarks(user_id);
create index shares_content_idx on public.shares(content_id);
create index shares_user_idx on public.shares(user_id);
create index follows_target_idx on public.follows(target_id);
create index quizzes_author_idx on public.quizzes(author_id);

alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.shares enable row level security;
alter table public.follows enable row level security;
alter table public.quizzes enable row level security;
alter table public.private_items enable row level security;
revoke all on public.comments,public.reactions,public.bookmarks,public.shares,public.follows,public.quizzes,public.private_items from anon,authenticated;
grant select,insert on public.comments,public.shares,public.quizzes to authenticated;
grant select,insert,delete on public.reactions,public.bookmarks,public.follows to authenticated;
grant select,insert,update on public.private_items to authenticated;
create policy members_read on public.comments for select to authenticated using(true);
create policy own_insert on public.comments for insert to authenticated with check(author_id=(select auth.uid()));
create policy members_read on public.quizzes for select to authenticated using(true);
create policy own_insert on public.quizzes for insert to authenticated with check(author_id=(select auth.uid()));
create policy members_read on public.reactions for select to authenticated using(true);
create policy own_insert on public.reactions for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_delete on public.reactions for delete to authenticated using(user_id=(select auth.uid()));
create policy own_read on public.bookmarks for select to authenticated using(user_id=(select auth.uid()));
create policy own_insert on public.bookmarks for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_delete on public.bookmarks for delete to authenticated using(user_id=(select auth.uid()));
create policy members_read on public.shares for select to authenticated using(true);
create policy own_insert on public.shares for insert to authenticated with check(user_id=(select auth.uid()));
create policy members_read on public.follows for select to authenticated using(true);
create policy own_insert on public.follows for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_delete on public.follows for delete to authenticated using(user_id=(select auth.uid()));
create policy own_read on public.private_items for select to authenticated using(user_id=(select auth.uid()));
create policy own_insert on public.private_items for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_update on public.private_items for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));


-- Practice quizzes expose explanations and answers intentionally. Scores are calculated here.
create function public.record_quiz_attempt(quiz_id uuid, answers jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare questions jsonb; score integer; total integer;
begin
 select q.questions into questions from public.quizzes q where q.id=quiz_id;
 if questions is null or jsonb_typeof(answers) <> 'array' or jsonb_array_length(answers) <> jsonb_array_length(questions) then raise exception 'Incomplete quiz attempt'; end if;
 if exists(select 1 from jsonb_array_elements(answers) a where a::text !~ '^[0-3]$') then raise exception 'Invalid answer'; end if;
 total := jsonb_array_length(questions);
 select count(*) into score from jsonb_array_elements(questions) with ordinality q(value,n) where (q.value->>'correctIndex')::integer = (answers->>((q.n-1)::integer))::integer;
 insert into public.private_items(user_id,kind,id,payload) values(auth.uid(),'result',quiz_id::text,jsonb_build_object('score',score,'total',total))
 on conflict(user_id,kind,id) do update set payload=jsonb_build_object('score',greatest((public.private_items.payload->>'score')::integer,score),'total',total);
end; $$;
revoke all on function public.record_quiz_attempt(uuid,jsonb) from public,anon;
grant execute on function public.record_quiz_attempt(uuid,jsonb) to authenticated;

-- Validate public JSON at the database boundary, not only in the React forms.
create function public.valid_questions(items jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare q jsonb; opt jsonb;
begin
 for q in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(q->'id') is distinct from 'string' or length(q->>'id') not between 1 and 100
   or jsonb_typeof(q->'prompt') is distinct from 'string' or length(trim(q->>'prompt')) not between 1 and 500
   or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') <> 4
   or jsonb_typeof(q->'explanation') is distinct from 'string' or length(q->>'explanation') > 1000
   or (q->>'correctIndex') is null or (q->>'correctIndex') !~ '^[0-3]$' then return false; end if;
  for opt in select value from jsonb_array_elements(q->'options') loop
   if jsonb_typeof(opt) <> 'string' or length(trim(opt #>> '{}')) not between 1 and 300 then return false; end if;
  end loop;
  if (select count(distinct trim(value #>> '{}')) from jsonb_array_elements(q->'options')) <> 4 then return false; end if;
 end loop;
 return true;
exception when others then return false;
end; $$;
alter table public.quizzes add constraint valid_question_data check(public.valid_questions(questions));
create function public.valid_tags(tags text[]) returns boolean language sql immutable set search_path = '' as $$
 select not exists(select 1 from unnest(tags) t where t is null or length(trim(t)) not between 1 and 120);
$$;
alter table public.profiles add constraint profile_tags_valid check(public.valid_tags(interests) and public.valid_tags(skills));
alter table public.posts add constraint post_image_valid check(image = '' or image ~* '^https?://' or image ~* '^data:image/(png|jpeg|webp|gif);base64,');
commit;

