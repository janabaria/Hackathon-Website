-- Run after 004_learning_workspace.sql.
begin;
create function public.valid_learning_game(g jsonb) returns boolean language sql immutable set search_path='' as $$
 select g is null or coalesce(jsonb_typeof(g)='object'
 and jsonb_typeof(g->'mode')='string' and g->>'mode' in ('blocks','cards')
 and jsonb_typeof(g->'title')='string' and length(trim(g->>'title')) between 1 and 120
 and jsonb_typeof(g->'instructions')='string' and length(g->>'instructions')<=500,false);
$$;
alter table public.quizzes add constraint valid_game_data check(public.valid_learning_game(game));
alter table public.posts add constraint optional_post_video_valid check(video_url='' or video_url ~* '^https?://');
commit;
