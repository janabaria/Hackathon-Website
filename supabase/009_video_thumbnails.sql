begin;
alter table public.posts add column thumbnail text not null default '' check(octet_length(thumbnail)<=1500000 and (thumbnail='' or thumbnail ~* '^https?://' or thumbnail ~* '^data:image/(png|jpeg|webp|gif);base64,'));
commit;
