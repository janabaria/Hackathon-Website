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

test('learning workspace enforces owner deletion, private notebooks, pod approvals and AI quota', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
    await db.exec(
      await readFile(new URL('../supabase/002_connected_app.sql', import.meta.url), 'utf8'),
    );
    const a = '11111111-1111-4111-8111-111111111111',
      b = '22222222-2222-4222-8222-222222222222',
      p = '33333333-3333-4333-8333-333333333333',
      pod = '44444444-4444-4444-8444-444444444444',
      comment = '55555555-5555-4555-8555-555555555555';
    await db.exec(
      `insert into auth.users(id) values('${a}'),('${b}');insert into public.profiles(id,name) values('${a}','Owner'),('${b}','Member');insert into public.posts(id,author_id,caption,topic) values('${p}','${a}','Preserved','Math');`,
    );
    await db.exec(
      await readFile(new URL('../supabase/004_learning_workspace.sql', import.meta.url), 'utf8'),
    );
    await db.exec(
      await readFile(new URL('../supabase/005_learning_validation.sql', import.meta.url), 'utf8'),
    );
    const asUser = async (id) =>
      db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
      );
    await asUser(a);
    await db.exec(
      `insert into public.pods values('${pod}','${a}','Private math','Private goal',25,'Quiet focus','private');insert into public.private_items values('${a}','notebook','notes','{"title":"Private notes"}');insert into public.comments(id,content_id,author_id,text) values('${comment}','${p}','${a}','Discussion');`,
    );
    await asUser(b);
    assert.equal((await db.query('select * from public.private_items')).rows.length, 0);
    assert.equal((await db.query('select * from public.pods')).rows.length, 0);
    assert.match(
      (await db.query('select * from public.list_pods()')).rows[0].goal,
      /request to join/,
    );
    await db.exec(
      `delete from public.posts where id='${p}';delete from public.comments where id='${comment}';delete from public.pods where id='${pod}';`,
    );
    assert.equal((await db.query('select * from public.posts')).rows.length, 1);
    assert.equal((await db.query('select * from public.comments')).rows.length, 1);
    await assert.rejects(
      db.exec(`insert into public.pod_requests values('${pod}','${b}','approved')`),
      /row-level security/,
    );
    await db.exec(
      `insert into public.pod_requests values('${pod}','${b}','pending');update public.pod_requests set status='approved' where user_id='${b}';`,
    );
    assert.equal(
      (await db.query('select status from public.pod_requests')).rows[0].status,
      'pending',
    );
    await asUser(a);
    await db.exec(`update public.pod_requests set status='approved' where user_id='${b}';`);
    await asUser(b);
    assert.equal((await db.query('select goal from public.pods')).rows[0].goal, 'Private goal');
    for (let i = 0; i < 10; i++) await db.exec('select public.claim_ai_generation()');
    await assert.rejects(db.exec('select public.claim_ai_generation()'), /Daily AI limit/);
    await asUser(a);
    await db.exec(
      `delete from public.comments where id='${comment}';delete from public.posts where id='${p}';delete from public.pods where id='${pod}';`,
    );
    assert.equal((await db.query('select * from public.posts')).rows.length, 0);
    assert.equal((await db.query('select * from public.comments')).rows.length, 0);
    assert.equal((await db.query('select * from public.pod_requests')).rows.length, 0);
    await db.exec(
      `reset role;insert into auth.users values('66666666-6666-4666-8666-666666666666','{"name":"New learner","interests":["Science"]}');`,
    );
    assert.deepEqual(
      (await db.query("select interests from public.profiles where name='New learner'")).rows[0]
        .interests,
      ['Science'],
    );
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.list_pods()'), /permission denied/);
  } finally {
    await db.close();
  }
});

test('two pod members share presence, signals and quiz answers while outsiders are denied', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
    for (const file of [
      'schema.sql',
      '002_connected_app.sql',
      '004_learning_workspace.sql',
      '005_learning_validation.sql',
      '006_social_study_rooms.sql',
    ])
      await db.exec(await readFile(new URL('../supabase/' + file, import.meta.url), 'utf8'));
    const a = '11111111-1111-4111-8111-111111111111',
      b = '22222222-2222-4222-8222-222222222222',
      c = '33333333-3333-4333-8333-333333333333',
      pod = '44444444-4444-4444-8444-444444444444',
      ca = '55555555-5555-4555-8555-555555555555',
      cb = '66666666-6666-4666-8666-666666666666',
      quiz = '77777777-7777-4777-8777-777777777777',
      run = '88888888-8888-4888-8888-888888888888';
    await db.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${c}');`);
    const asUser = (id) =>
      db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
      );
    await asUser(a);
    await db.exec(
      `update public.profiles set avatar='data:image/png;base64,aGVsbG8=' where id='${a}';insert into public.pods values('${pod}','${a}','Study','Cells',25,'Practice','private');insert into public.quizzes(id,author_id,title,topic,difficulty,questions)values('${quiz}','${a}','Cells','Biology','Beginner','[{"id":"q1","prompt":"Select","options":["a","b","c","d"],"correctIndex":0,"explanation":"a"}]');insert into public.pod_rooms(pod_id,run_id,quiz_id,phase)values('${pod}','${run}','${quiz}','question');insert into public.pod_presence(id,pod_id,user_id)values('${ca}','${pod}','${a}');`,
    );
    await asUser(b);
    await assert.rejects(
      db.exec(`insert into public.pod_presence(id,pod_id,user_id)values('${cb}','${pod}','${b}')`),
      /row-level security/,
    );
    await db.exec(`insert into public.pod_requests values('${pod}','${b}','pending')`);
    await asUser(a);
    await db.exec(`update public.pod_requests set status='approved' where user_id='${b}'`);
    await asUser(b);
    await db.exec(
      `insert into public.pod_presence(id,pod_id,user_id)values('${cb}','${pod}','${b}');insert into public.pod_signals(pod_id,sender_id,recipient_id,body)values('${pod}','${cb}','${ca}','{"description":{"type":"offer","sdp":"test"}}');insert into public.pod_answers values('${pod}','${run}','${b}',0,1);`,
    );
    assert.equal((await db.query('select * from public.pod_presence')).rows.length, 2);
    await assert.rejects(
      db.exec(
        `insert into public.pod_signals(pod_id,sender_id,recipient_id,body)values('${pod}','${ca}','${cb}','{}')`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(`insert into public.pod_answers values('${pod}','${run}','${a}',0,0)`),
      /row-level security/,
    );
    await db.exec(`update public.pod_rooms set phase='finished' where pod_id='${pod}'`);
    assert.equal((await db.query('select phase from public.pod_rooms')).rows[0].phase, 'question');
    await asUser(a);
    assert.equal((await db.query('select * from public.pod_signals')).rows.length, 1);
    await db.exec(`insert into public.pod_answers values('${pod}','${run}','${a}',0,0)`);
    assert.equal((await db.query('select * from public.pod_answers')).rows.length, 2);
    await db.exec(`update public.pod_rooms set phase='revealed' where pod_id='${pod}'`);
    await asUser(b);
    assert.equal((await db.query('select phase from public.pod_rooms')).rows[0].phase, 'revealed');
    await asUser(c);
    assert.equal((await db.query('select * from public.pod_rooms')).rows.length, 0);
    assert.equal((await db.query('select * from public.pod_presence')).rows.length, 0);
    assert.equal((await db.query('select * from public.pod_answers')).rows.length, 0);
    await db.exec(`update public.profiles set avatar='' where id='${a}'`);
    assert.match(
      (await db.query(`select avatar from public.profiles where id='${a}'`)).rows[0].avatar,
      /data:image/,
    );
  } finally {
    await db.close();
  }
});

test('admin controls enforce owner access, adjustable quotas, reversible moderation and audit', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
    for (const file of [
      'schema.sql',
      '002_connected_app.sql',
      '004_learning_workspace.sql',
      '005_learning_validation.sql',
      '006_social_study_rooms.sql',
      '007_admin_controls.sql',
      '009_video_thumbnails.sql',
      '010_reel_comments.sql',
      '011_owner_editing.sql',
    ])
      await db.exec(await readFile(new URL('../supabase/' + file, import.meta.url), 'utf8'));
    const owner = '11111111-1111-4111-8111-111111111111',
      member = '22222222-2222-4222-8222-222222222222',
      post = '33333333-3333-4333-8333-333333333333',
      pod = '44444444-4444-4444-8444-444444444444';
    await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${owner}','mhamedmohamad3@gmail.com',now()),('${member}','member@example.test',now());
      insert into public.posts(id,author_id,caption,topic) values('${post}','${member}','Learning','Biology');
      insert into public.pods(id,author_id,title,goal,minutes,vibe,visibility) values('${pod}','${member}','Study','Private goal',25,'Practice','private');`);
    await db.exec(
      `update public.posts set thumbnail='data:image/png;base64,AAAA' where id='${post}'`,
    );
    await assert.rejects(
      db.exec(`update public.posts set thumbnail='javascript:alert(1)' where id='${post}'`),
      /check constraint/,
    );
    assert.equal(
      (await db.query(`select thumbnail from public.posts where id='${post}'`)).rows[0].thumbnail,
      'data:image/png;base64,AAAA',
    );
    await db.exec(
      await readFile(new URL('../supabase/008_activate_owner.sql', import.meta.url), 'utf8'),
    );
    const asUser = (id) =>
      db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
      );
    await asUser(member);
    assert.equal((await db.query('select public.is_app_admin() as admin')).rows[0].admin, false);
    const commentId = '99999999-9999-4999-8999-999999999999';
    await db.exec(
      `insert into public.comments(id,content_id,author_id,text) values('${commentId}','${post}','${member}','A useful explanation');insert into public.comment_likes values('${commentId}','${member}')`,
    );
    await assert.rejects(
      db.exec(`insert into public.comment_likes values('${commentId}','${owner}')`),
      /row-level security/,
    );
    assert.equal((await db.query(`select * from public.comment_likes`)).rows.length, 1);
    await db.exec(
      `delete from public.comment_likes where comment_id='${commentId}' and user_id='${member}'`,
    );
    assert.equal((await db.query(`select * from public.comment_likes`)).rows.length, 0);

    await db.exec(
      `update public.posts set caption='Edited learning' where id='${post}'; update public.comments set text='Edited comment' where id='${commentId}'; update public.pods set title='Edited pod' where id='${pod}';`,
    );
    assert.equal(
      (await db.query(`select caption from public.posts where id='${post}'`)).rows[0].caption,
      'Edited learning',
    );
    await assert.rejects(
      db.exec(`update public.posts set author_id='${owner}' where id='${post}'`),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(`update public.posts set moderated=true where id='${post}'`),
      /permission denied/,
    );
    await asUser(owner);
    await db.exec(
      `update public.posts set caption='Forged edit' where id='${post}'; update public.comments set text='Forged edit' where id='${commentId}';`,
    );
    assert.equal(
      (await db.query(`select caption from public.posts where id='${post}'`)).rows[0].caption,
      'Edited learning',
    );
    assert.equal(
      (await db.query(`select text from public.comments where id='${commentId}'`)).rows[0].text,
      'Edited comment',
    );
    await asUser(member);
    await assert.rejects(db.query('select public.admin_dashboard()'), /Admin access/);
    await assert.rejects(
      db.exec(
        `select public.admin_change('settings',null,'{"daily_ai_limit":-1,"ai_enabled":true}','forged')`,
      ),
      /Admin access/,
    );
    await assert.rejects(
      db.exec(`insert into public.app_admins values('${member}')`),
      /permission denied/,
    );
    await db.exec(
      `insert into public.private_items values('${member}','notebook','private','{"title":"Private notes"}')`,
    );
    for (let n = 0; n < 10; n++) await db.exec('select public.claim_ai_generation()');
    await assert.rejects(db.exec('select public.claim_ai_generation()'), /allowance reached/);
    await asUser(owner);
    for (let n = 0; n < 12; n++) await db.exec('select public.claim_ai_generation()');
    const initial = (await db.query('select public.admin_dashboard() as d')).rows[0].d;
    assert.equal(initial.users.find((u) => u.id === owner).daily_ai_limit, -1);
    assert.equal(initial.users.find((u) => u.id === member).used, 10);
    assert.equal((await db.query('select * from public.private_items')).rows.length, 0);
    await db.exec(`select public.admin_change('reset_usage','${member}','{}','Support reset')`);
    await db.exec(
      `select public.admin_change('user','${member}','{"daily_ai_limit":1,"restricted":false}','One request allowance')`,
    );
    await asUser(member);
    await db.exec('select public.claim_ai_generation()');
    await assert.rejects(db.exec('select public.claim_ai_generation()'), /allowance reached/);
    await asUser(owner);
    await assert.rejects(
      db.exec(
        `select public.admin_change('user','${owner}','{"daily_ai_limit":-1,"restricted":true}','Do not lock out owner')`,
      ),
      /Cannot restrict/,
    );
    await db.exec(`select public.admin_change('user','${member}','{"daily_ai_limit":null,"restricted":true}','Restrict contributions');
      select public.admin_change('moderate','${post}','{"kind":"post","hidden":true}','Review this content');
      select public.admin_change('moderate','${pod}','{"kind":"pod","hidden":true}','Review this pod');`);
    await asUser(member);
    await assert.rejects(db.exec('select public.claim_ai_generation()'), /restricted/);
    await assert.rejects(
      db.exec(
        `insert into public.posts(author_id,caption,topic) values('${member}','Blocked','Biology')`,
      ),
      /row-level security/,
    );
    assert.equal((await db.query('select * from public.posts')).rows.length, 0);
    assert.equal((await db.query('select * from public.list_pods()')).rows.length, 0);
    assert.equal(
      (await db.query(`select public.can_use_pod('${pod}') as allowed`)).rows[0].allowed,
      false,
    );
    await asUser(owner);
    await db.exec(`select public.admin_change('user','${member}','{"daily_ai_limit":null,"restricted":false}','Restore member');
      select public.admin_change('moderate','${post}','{"kind":"post","hidden":false}','Restore content');
      select public.admin_change('settings',null,'{"daily_ai_limit":0,"ai_enabled":true}','Pause default allowance')`);
    await asUser(member);
    assert.equal((await db.query('select * from public.posts')).rows.length, 1);
    await assert.rejects(db.exec('select public.claim_ai_generation()'), /allowance reached/);
    await asUser(owner);
    await db.exec(
      `select public.admin_change('settings',null,'{"daily_ai_limit":100,"ai_enabled":false}','Pause all AI')`,
    );
    await assert.rejects(db.exec('select public.claim_ai_generation()'), /paused/);
    const end = (await db.query('select public.admin_dashboard() as d')).rows[0].d;
    assert.ok(end.audit.length >= 9);
    assert.ok(end.audit.every((a) => a.reason && a.actor_id === owner));
    await assert.rejects(db.exec('delete from public.admin_audit'), /permission denied/);
    await db.exec('reset role');
    const seed = await readFile(
      new URL('../supabase/012_starter_posts.sql', import.meta.url),
      'utf8',
    );
    await db.exec(seed);
    await db.exec(seed);
    assert.equal((await db.query('select count(*)::int as n from public.posts')).rows[0].n, 11);
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select public.admin_dashboard()'), /permission denied/);
  } finally {
    await db.close();
  }
});

test('comment replies stay on the same content and survive parent deletion', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
    await db.exec(
      await readFile(new URL('../supabase/002_connected_app.sql', import.meta.url), 'utf8'),
    );
    await db.exec(
      await readFile(new URL('../supabase/013_comment_replies.sql', import.meta.url), 'utf8'),
    );
    await db.exec(`insert into auth.users values('11111111-1111-4111-8111-111111111111');
      insert into profiles(id,name) values('11111111-1111-4111-8111-111111111111','Learner');
      insert into posts(id,author_id,caption,topic) values
      ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','One','Study'),
      ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Two','Study');
      insert into comments(id,content_id,author_id,text) values
      ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Question');`);
    await assert.rejects(
      db.exec(
        `insert into comments(id,content_id,author_id,text,parent_id) values(gen_random_uuid(),'33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Wrong thread','44444444-4444-4444-8444-444444444444');`,
      ),
      /same content/,
    );
    await db.exec(`insert into comments(id,content_id,author_id,text,parent_id) values(gen_random_uuid(),'22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Answer','44444444-4444-4444-8444-444444444444');
      delete from comments where id='44444444-4444-4444-8444-444444444444';`);
    const { rows } = await db.query('select text,parent_id from comments');
    assert.deepEqual(rows, [{ text: 'Answer', parent_id: null }]);
  } finally {
    await db.close();
  }
});

test('maze publishing and quiz deletion enforce author ownership', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
    for (const file of ['schema.sql', '002_connected_app.sql', '016_learning_games.sql'])
      await db.exec(await readFile(new URL('../supabase/' + file, import.meta.url), 'utf8'));
    const a = '11111111-1111-4111-8111-111111111111',
      b = '22222222-2222-4222-8222-222222222222',
      g = '33333333-3333-4333-8333-333333333333';
    await db.exec(
      `insert into auth.users values('${a}'),('${b}');insert into profiles(id,name) values('${a}','A'),('${b}','B');select set_config('request.jwt.claim.sub','${a}',false);set role authenticated;insert into learning_games values('${g}','${a}','A maze','{"start":10,"goal":14,"walls":[],"stars":[12]}');`,
    );
    await assert.rejects(
      db.exec(`update learning_games set level='{"start":10,"goal":14,"walls":[12],"stars":[12]}'`),
      /valid_maze_shape/,
    );
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${b}',false);set role authenticated;delete from learning_games where id='${g}';update learning_games set title='forged' where id='${g}';`,
    );
    assert.equal((await db.query('select title from learning_games')).rows[0].title, 'A maze');
    await assert.rejects(
      db.exec(
        `insert into learning_games values(gen_random_uuid(),'${a}','forged','{"start":0,"goal":24,"walls":[],"stars":[]}')`,
      ),
      /row-level security/,
    );
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${a}',false);set role authenticated;delete from learning_games where id='${g}';`,
    );
    assert.equal((await db.query('select * from learning_games')).rows.length, 0);
    const q = '44444444-4444-4444-8444-444444444444';
    await db.exec(
      `insert into quizzes values('${q}','${a}','Owned quiz','Math','Beginner','[{"id":"q1","prompt":"Choose","options":["a","b","c","d"],"correctIndex":1,"explanation":""}]');reset role;select set_config('request.jwt.claim.sub','${b}',false);set role authenticated;delete from quizzes where id='${q}';`,
    );
    assert.equal((await db.query(`select id from quizzes where id='${q}'`)).rows.length, 1);
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${a}',false);set role authenticated;delete from quizzes where id='${q}';`,
    );
    assert.equal((await db.query(`select id from quizzes where id='${q}'`)).rows.length, 0);
  } finally {
    await db.close();
  }
});
