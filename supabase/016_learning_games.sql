begin;
grant delete on public.quizzes to authenticated;
create policy quiz_owner_delete on public.quizzes for delete to authenticated using(author_id=(select auth.uid()));
create function public.valid_maze(level jsonb) returns boolean language plpgsql immutable set search_path=public as $$
declare n jsonb; w jsonb; a integer; b integer;
begin
 if jsonb_typeof(level) is distinct from 'object' or jsonb_typeof(level->'walls') is distinct from 'array' or jsonb_typeof(level->'stars') is distinct from 'array' then return false; end if;
 if jsonb_typeof(level->'start') is distinct from 'number' or jsonb_typeof(level->'goal') is distinct from 'number' then return false; end if;
 if (level->>'start') !~ '^[0-9]+$' or (level->>'goal') !~ '^[0-9]+$' then return false; end if;
 a := (level->>'start')::int; b := (level->>'goal')::int;
 if a is null or b is null or a not between 0 and 24 or b not between 0 and 24 or a=b or jsonb_array_length(level->'walls')>23 or jsonb_array_length(level->'stars')>8 then return false; end if;
 for n in select value from jsonb_array_elements((level->'walls')||(level->'stars')) loop
  if jsonb_typeof(n)<>'number' or n::text !~ '^[0-9]+$' or n::int not between 0 and 24 or n::int in(a,b) then return false; end if;
 end loop;
 if (select count(*)<>count(distinct value) from jsonb_array_elements((level->'walls')||(level->'stars'))) then return false; end if;
 return true;
exception when others then return false;
end $$;
create table public.learning_games (
 id uuid primary key, author_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 level jsonb not null,
 constraint valid_maze_shape check (public.valid_maze(level))
);
alter table public.learning_games enable row level security;
grant select,insert,update,delete on public.learning_games to authenticated;
create policy games_read on public.learning_games for select to authenticated using(true);
create policy games_create on public.learning_games for insert to authenticated with check(author_id=(select auth.uid()));
create policy games_edit on public.learning_games for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy games_delete on public.learning_games for delete to authenticated using(author_id=(select auth.uid()));
commit;
