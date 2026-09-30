import { describe, expect, it } from 'vitest';
import { createEmptyData, dataSchema, type Quiz } from './schema';
import { reduceData } from './actions';

describe('workspace integrity', () => {
  it('starts without sample content or progress', () => {
    const data = createEmptyData();
    expect(dataSchema.safeParse(data).success).toBe(true);
    expect(
      [
        data.posts,
        data.accounts,
        data.reels,
        data.quizzes,
        data.pods,
        data.completedSessions,
      ].every((a) => a.length === 0),
    ).toBe(true);
    expect(data.profile.name).toBe('');
  });
  it('rejects imports with orphaned authors and unsafe image sources', () => {
    const data = createEmptyData();
    data.posts = [
      {
        id: 'post',
        authorId: 'missing-person',
        caption: 'A finding',
        topic: 'Topic',
        image: 'javascript:alert(1)',
        createdAt: new Date().toISOString(),
        liked: false,
        saved: false,
        shares: 0,
      },
    ];
    expect(dataSchema.safeParse(data).success).toBe(false);
  });
  it('counts completion only once even if the timer effect repeats', () => {
    const state = reduceData(createEmptyData(), { type: 'session/complete', id: 'session-1' });
    expect(
      reduceData(state, { type: 'session/complete', id: 'session-1' }).completedSessions,
    ).toEqual(['session-1']);
  });
  it('computes scores from authored answers, requires full submission, and keeps the best score', () => {
    const quiz: Quiz = {
      id: 'quiz',
      title: 'Test',
      topic: 'Test',
      difficulty: 'Beginner',
      questions: [
        {
          id: 'question',
          prompt: 'Choose B',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
          explanation: '',
        },
      ],
    };
    const state = { ...createEmptyData(), quizzes: [quiz] };
    expect(
      reduceData(state, { type: 'quiz/complete', id: quiz.id, answers: [] }).quizResults,
    ).toEqual({});
    const passed = reduceData(state, { type: 'quiz/complete', id: quiz.id, answers: [1] });
    expect(passed.quizResults.quiz.score).toBe(1);
    expect(
      reduceData(passed, { type: 'quiz/complete', id: quiz.id, answers: [0] }).quizResults.quiz
        .score,
    ).toBe(1);
  });
});

it('preserves reactions and rejects edits to another author', () => {
  const state = createEmptyData();
  const p = {
    id: 'p',
    authorId: state.profile.id,
    caption: 'Before',
    topic: 'Biology',
    image: '',
    createdAt: '2026-09-30T00:00:00Z',
    liked: true,
    saved: true,
    shares: 2,
    likeCount: 4,
  };
  state.posts = [p];
  const next = reduceData(state, {
    type: 'content/edit',
    id: 'p',
    changes: { caption: 'After', topic: 'Cooking' },
  });
  expect(next.posts[0]).toMatchObject({
    caption: 'After',
    liked: true,
    likeCount: 4,
    saved: true,
    createdAt: p.createdAt,
  });
  state.posts = [{ ...p, authorId: 'someone-else' }];
  expect(() =>
    reduceData(state, { type: 'content/edit', id: 'p', changes: { caption: 'No', topic: 'No' } }),
  ).toThrow('own content');
});
