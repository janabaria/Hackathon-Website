-- Run once in your Supabase project's SQL Editor. No sample data is inserted.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  bio text not null default '' check (char_length(bio) <= 600),
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  skills text[] not null default '{}' check (cardinality(skills) <= 20)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null check (char_length(trim(caption)) between 1 and 2000),
  topic text not null check (char_length(trim(topic)) between 1 and 120),
  created_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts(created_at desc);
create index posts_author_id_idx on public.posts(author_id);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

revoke all on public.profiles, public.posts from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.posts to authenticated;

create policy "Members read profiles" on public.profiles for select to authenticated using (true);
create policy "Members create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Members update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Members read posts" on public.posts for select to authenticated using (true);
create policy "Members publish own posts" on public.posts for insert to authenticated with check ((select auth.uid()) = author_id);

commit;
