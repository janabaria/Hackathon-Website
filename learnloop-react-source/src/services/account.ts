import { supabase } from './supabase';
import { createEmptyData, dataSchema, type AppData } from '../domain/schema';
import { type Action } from '../domain/actions';

// Pagination avoids silently truncating a workspace at Supabase's row limit.
async function rows(table: string, order = 'id') {
  const result: Record<string, any>[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase!
      .from(table)
      .select('*')
      .order(order)
      .range(offset, offset + 499);
    if (error) throw error;
    result.push(...data);
    if (data.length < 500) return result;
  }
}

export async function readAccount(userId: string): Promise<AppData> {
  const [people, content, comments, reactions, bookmarks, shares, follows, quizzes, privateItems] =
    await Promise.all([
      rows('profiles'),
      rows('posts'),
      rows('comments'),
      rows('reactions', 'content_id'),
      rows('bookmarks', 'content_id'),
      rows('shares'),
      rows('follows', 'user_id'),
      rows('quizzes'),
      rows('private_items', 'id'),
    ]);
  const empty = createEmptyData();
  const profile = people.find((p) => p.id === userId) ?? { ...empty.profile, id: userId };
  const mapped = content
    .map((p) => ({
      id: p.id,
      authorId: p.author_id,
      caption: p.caption,
      topic: p.topic,
      createdAt: new Date(p.created_at).toISOString(),
      image: p.image ?? '',
      title: p.title,
      videoUrl: p.video_url,
      liked: reactions.some((r) => r.content_id === p.id && r.user_id === userId),
      saved: bookmarks.some((r) => r.content_id === p.id),
      shares: shares.filter((r) => r.content_id === p.id).length,
      likeCount: reactions.filter((r) => r.content_id === p.id).length,
      kind: p.kind,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const item = (kind: string) => privateItems.find((p) => p.kind === kind)?.payload;
  return dataSchema.parse({
    ...empty,
    profile,
    accounts: people.filter((p) => p.id !== userId),
    posts: mapped.filter((p) => p.kind === 'post'),
    reels: mapped.filter((p) => p.kind === 'reel'),
    quizzes,
    comments: comments.map((c) => ({
      id: c.id,
      contentId: c.content_id,
      authorId: c.author_id,
      text: c.text,
    })),
    following: follows.filter((f) => f.user_id === userId).map((f) => f.target_id),
    pods: privateItems.filter((p) => p.kind === 'pod').map((p) => p.payload),
    completedSessions: privateItems.filter((p) => p.kind === 'session').map((p) => p.id),
    quizResults: Object.fromEntries(
      privateItems
        .filter((p) => p.kind === 'result' && quizzes.some((q) => q.id === p.id))
        .map((p) => [p.id, p.payload]),
    ),
    draft: item('draft') ?? '',
    settings: item('settings') ?? empty.settings,
  });
}

export async function writeAccount(userId: string, state: AppData, action: Action) {
  const db = supabase!;
  async function check(request: PromiseLike<{ error: unknown }>) {
    const { error } = await request;
    if (error) throw error;
  }
  if (['comment/add', 'account/follow', 'quiz/add'].includes(action.type))
    await check(
      db.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true }),
    );
  const privateSave = (kind: string, id: string, payload: unknown) =>
    check(db.from('private_items').upsert({ user_id: userId, kind, id, payload }));
  switch (action.type) {
    case 'data/replace':
      throw new Error(
        'Import and reset are disabled for shared accounts. Your cloud data was not changed.',
      );
    case 'profile/update':
      return check(db.from('profiles').upsert({ ...action.profile, id: userId }));
    case 'post/add':
    case 'reel/add': {
      // New members can publish before filling in their profile, without changing existing profiles.
      await check(
        db.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true }),
      );
      const p = action.type === 'post/add' ? action.post : action.reel;
      return check(
        db.from('posts').insert({
          id: p.id,
          author_id: userId,
          caption: p.caption,
          topic: p.topic,
          kind: action.type === 'post/add' ? 'post' : 'reel',
          image: 'image' in p ? p.image : '',
          title: 'title' in p ? p.title : '',
          video_url: 'videoUrl' in p ? p.videoUrl : '',
        }),
      );
    }
    case 'comment/add':
      return check(
        db.from('comments').insert({
          id: action.comment.id,
          content_id: action.comment.contentId,
          author_id: userId,
          text: action.comment.text,
        }),
      );
    case 'content/toggle': {
      const content = [...state.posts, ...state.reels].find((p) => p.id === action.id);
      if (!content) throw new Error('This content is no longer available. Refresh and try again.');
      const table = action.field === 'liked' ? 'reactions' : 'bookmarks';
      return content[action.field]
        ? check(db.from(table).delete().eq('content_id', action.id).eq('user_id', userId))
        : check(
            db
              .from(table)
              .upsert({ content_id: action.id, user_id: userId }, { ignoreDuplicates: true }),
          );
    }
    case 'content/share':
      return check(db.from('shares').insert({ content_id: action.id, user_id: userId }));
    case 'account/follow':
      return state.following.includes(action.id)
        ? check(db.from('follows').delete().eq('user_id', userId).eq('target_id', action.id))
        : check(
            db
              .from('follows')
              .upsert({ user_id: userId, target_id: action.id }, { ignoreDuplicates: true }),
          );
    case 'quiz/add':
      return check(db.from('quizzes').insert({ ...action.quiz, author_id: userId }));
    case 'pod/add':
      return privateSave('pod', action.pod.id, action.pod);
    case 'session/complete':
      return privateSave('session', action.id, true);
    case 'quiz/complete':
      return check(db.rpc('record_quiz_attempt', { quiz_id: action.id, answers: action.answers }));
    case 'draft/save':
      return privateSave('draft', 'current', action.text);
    case 'settings/update':
      return privateSave('settings', 'current', action.settings);
  }
}
