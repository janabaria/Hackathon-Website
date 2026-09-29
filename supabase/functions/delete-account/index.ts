import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) return reply({ error: 'Sign in first' }, 401);
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user) return reply({ error: 'Invalid session' }, 401);
  try {
    if ((await req.json()).confirmation !== 'DELETE')
      return reply({ error: 'Confirmation required' }, 400);
    // This bucket uses flat userId/file paths. Remove storage through the Storage API before deleting the auth user.
    while (true) {
      const { data: files, error: listing } = await admin.storage
        .from('reel-videos')
        .list(user.id, { limit: 100 });
      if (listing) throw listing;
      if (!files?.length) break;
      const { error: removal } = await admin.storage
        .from('reel-videos')
        .remove(files.map((f) => `${user.id}/${f.name}`));
      if (removal) throw removal;
    }
    const { error: deletion } = await admin.auth.admin.deleteUser(user.id);
    if (deletion) throw deletion;
    return reply({ deleted: true });
  } catch {
    return reply({ error: 'Could not complete account deletion. Please retry.' }, 500);
  }
});
