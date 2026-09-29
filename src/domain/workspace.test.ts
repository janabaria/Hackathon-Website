import { describe, it, expect } from 'vitest';
import { createEmptyData, dataSchema } from './schema';
import { reduceData } from './actions';
import { learningReminders } from './reminders';
const notebook = {
  id: 'n1',
  title: 'Cells',
  subject: 'Biology',
  createdAt: '2026-09-24T10:00:00.000Z',
  sections: [
    { id: 's1', title: 'Basics', notes: 'A cell is the basic unit of life.', contentIds: [] },
  ],
};
describe('learning workspace', () => {
  it('keeps notebook sections through a validated save and reload', () => {
    const data = reduceData(createEmptyData(), { type: 'notebook/save', notebook });
    expect(dataSchema.parse(JSON.parse(JSON.stringify(data))).notebooks[0]).toEqual(notebook);
  });
  it('shows notebook reminders at four days, not before, and persists dismissal', () => {
    const data = reduceData(createEmptyData(), { type: 'notebook/save', notebook });
    expect(learningReminders(data, new Date('2026-09-28T09:59:59Z'))).toHaveLength(0);
    expect(learningReminders(data, new Date('2026-09-28T10:00:00Z'))).toHaveLength(1);
    const dismissed = reduceData(data, { type: 'reminder/dismiss', id: 'notebook-n1' });
    expect(learningReminders(dismissed, new Date('2026-09-30T10:00:00Z'))).toHaveLength(0);
  });
  it('shows exam reminders within the chosen window including exam day', () => {
    const data = reduceData(createEmptyData(), {
      type: 'exam/save',
      exam: {
        id: 'e1',
        title: 'Biology final',
        subject: 'Biology',
        date: '2026-10-10',
        reminderDays: 3,
      },
    });
    expect(learningReminders(data, new Date(2026, 9, 6))).toHaveLength(0);
    expect(learningReminders(data, new Date(2026, 9, 7))).toHaveLength(1);
    expect(learningReminders(data, new Date(2026, 9, 10))).toHaveLength(1);
    expect(learningReminders(data, new Date(2026, 9, 11))).toHaveLength(0);
  });
  it('rejects deleting someone else’s content and cascades own discussions', () => {
    const data = createEmptyData();
    data.posts = [
      {
        id: 'p1',
        authorId: 'someone-else',
        caption: 'Test',
        topic: 'Math',
        image: '',
        createdAt: new Date().toISOString(),
        liked: false,
        saved: false,
        shares: 0,
      },
    ];
    expect(() => reduceData(data, { type: 'content/delete', id: 'p1' })).toThrow('own content');
    data.posts[0].authorId = data.profile.id;
    data.comments = [{ id: 'c1', contentId: 'p1', authorId: data.profile.id, text: 'Question' }];
    const next = reduceData(data, { type: 'content/delete', id: 'p1' });
    expect(next.posts).toHaveLength(0);
    expect(next.comments).toHaveLength(0);
  });
  it('prevents a member approving their own pod request', () => {
    const data = createEmptyData();
    data.pods = [
      {
        id: 'pod1',
        authorId: 'another',
        visibility: 'private',
        title: 'Study',
        goal: 'Learn',
        minutes: 25,
        vibe: 'Quiet focus',
      },
    ];
    const pending = reduceData(data, { type: 'pod/request', podId: 'pod1' });
    expect(pending.podRequests[0].status).toBe('pending');
    expect(() =>
      reduceData(pending, {
        type: 'pod/respond',
        podId: 'pod1',
        userId: data.profile.id,
        status: 'approved',
      }),
    ).toThrow('creator');
  });
});
