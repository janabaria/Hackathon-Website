import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migration preserves existing posts and isolates accounts', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;`);
    await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
    const a = '11111111-1111-4111-8111-111111111111',
      b = '22222222-2222-4222-8222-222222222222',
      p = '33333333-3333-4333-8333-333333333333';
    await db.exec(
      `insert into auth.users values('${a}'),('${b}'); insert into public.profiles(id,name) values('${a}','A'),('${b}','B'); insert into public.posts(id,author_id,caption,topic) values('${p}','${a}','Existing learning','Testing');`,
    );
    await db.exec(
      await readFile(new URL('../supabase/002_connected_app.sql', import.meta.url), 'utf8'),
    );
    const asUser = async (id) => {
      await db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
      );
    };
    await asUser(a);
    assert.equal((await db.query('select kind from public.posts')).rows[0].kind, 'post');
    await db.exec(
      `insert into public.private_items values('${a}','draft','current','"Private draft"'); insert into public.bookmarks values('${p}','${a}'); insert into public.reactions values('${p}','${a}');`,
    );
    await asUser(b);
    assert.equal((await db.query('select * from public.private_items')).rows.length, 0);
    assert.equal((await db.query('select * from public.bookmarks')).rows.length, 0);
    assert.equal((await db.query('select * from public.reactions')).rows.length, 1);
    await assert.rejects(
      db.exec(
        `insert into public.comments(id,content_id,author_id,text) values(gen_random_uuid(),'${p}','${a}','forged');`,
      ),
      /row-level security/,
    );
    await db.exec(`update public.profiles set name='forged' where id='${a}';`);
    assert.equal(
      (await db.query(`select name from public.profiles where id='${a}'`)).rows[0].name,
      'A',
    );
    await db.exec(
      `insert into public.comments(id,content_id,author_id,text) values(gen_random_uuid(),'${p}','${b}','Real comment'); insert into public.follows values('${b}','${a}'); insert into public.reactions values('${p}','${b}');`,
    );
    assert.equal((await db.query('select * from public.reactions')).rows.length, 2);
    await db.exec(`delete from public.reactions where user_id='${a}';`);
    assert.equal((await db.query('select * from public.reactions')).rows.length, 2);
    const quiz = '44444444-4444-4444-8444-444444444444';
    await db.exec(
      `insert into public.quizzes values('${quiz}','${b}','Quiz','Testing','Beginner','[{"id":"q1","prompt":"Choose","options":["a","b","c","d"],"correctIndex":1,"explanation":""}]'); select public.record_quiz_attempt('${quiz}','[1]'); select public.record_quiz_attempt('${quiz}','[0]');`,
    );
    assert.equal(
      (await db.query(`select payload from public.private_items where kind='result'`)).rows[0]
        .payload.score,
      1,
    );
    await assert.rejects(
      db.exec(`select public.record_quiz_attempt('${quiz}','[]')`),
      /Incomplete/,
    );
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from public.posts'), /permission denied/);
    await assert.rejects(db.query('select * from public.private_items'), /permission denied/);
  } finally {
    await db.close();
  }
});

test('video storage restricts uploads to the owner folder and blocks anonymous reads', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to anon,authenticated;
 grant select,insert on storage.objects to authenticated,anon;`);
    await db.exec(
      await readFile(new URL('../supabase/003_reel_uploads.sql', import.meta.url), 'utf8'),
    );
    const user = '11111111-1111-4111-8111-111111111111';
    await db.exec(
      `select set_config('request.jwt.claim.sub','${user}',false); set role authenticated; insert into storage.objects(bucket_id,name) values('reel-videos','${user}/lesson.mp4');`,
    );
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name) values('reel-videos','another-user/lesson.mp4')`,
      ),
      /row-level security/,
    );
    assert.equal((await db.query('select * from storage.objects')).rows.length, 1);
    await db.exec('reset role; set role anon;');
    assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
  } finally {
    await db.close();
  }
});
