-- Run once after 002_connected_app.sql. Keeps existing reels and posts.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('reel-videos','reel-videos',false,52428800,array['video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "Members upload own reel videos" on storage.objects
for insert to authenticated with check (
 bucket_id='reel-videos' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy "Members play reel videos" on storage.objects
for select to authenticated using(bucket_id='reel-videos');
commit;
