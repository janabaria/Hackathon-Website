import { describe, it, expect } from 'vitest';
import { createEmptyData } from './schema';
import { reduceData } from './actions';
describe('community state', () => {
  it('keeps following and follower graph synchronized across toggles', () => {
    const initial = createEmptyData();
    initial.accounts.push({ ...initial.profile, id: 'other', name: 'Other' });
    const followed = reduceData(initial, { type: 'account/follow', id: 'other' });
    expect(followed.following).toEqual(['other']);
    expect(followed.followEdges).toEqual([{ userId: initial.profile.id, targetId: 'other' }]);
    const unfollowed = reduceData(followed, { type: 'account/follow', id: 'other' });
    expect(unfollowed.following).toEqual([]);
    expect(unfollowed.followEdges).toEqual([]);
  });
  it('rejects replies to another content and preserves replies when parent is removed', () => {
    const initial = createEmptyData();
    initial.comments.push({
      id: 'parent',
      contentId: 'post',
      authorId: initial.profile.id,
      text: 'Question',
    });
    expect(() =>
      reduceData(initial, {
        type: 'comment/add',
        comment: {
          id: 'bad',
          contentId: 'different',
          authorId: initial.profile.id,
          text: 'reply',
          parentId: 'parent',
        },
      }),
    ).toThrow('no longer');
    const next = reduceData(initial, {
      type: 'comment/add',
      comment: {
        id: 'reply',
        contentId: 'post',
        authorId: initial.profile.id,
        text: 'Answer',
        parentId: 'parent',
      },
    });
    const removed = reduceData(next, { type: 'comment/delete', id: 'parent' });
    expect(removed.comments).toHaveLength(1);
    expect(removed.comments[0].text).toBe('Answer');
    expect(removed.comments[0].parentId).toBeUndefined();
  });
});
