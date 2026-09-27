import type { AppData, Comment, Pod, Post, Profile, Quiz, Reel } from './schema';

export type Action =
  | { type: 'post/add'; post: Post }
  | { type: 'reel/add'; reel: Reel }
  | { type: 'quiz/add'; quiz: Quiz }
  | { type: 'pod/add'; pod: Pod }
  | { type: 'content/toggle'; id: string; field: 'liked' | 'saved' }
  | { type: 'content/share'; id: string }
  | { type: 'comment/add'; comment: Comment }
  | { type: 'profile/update'; profile: Profile }
  | { type: 'account/follow'; id: string }
  | { type: 'session/complete'; id: string }
  | { type: 'quiz/complete'; id: string; answers: number[] }
  | { type: 'draft/save'; text: string }
  | { type: 'settings/update'; settings: AppData['settings'] }
  | { type: 'data/replace'; data: AppData };

/** Pure state transitions. UI components never mutate a stored record. */
export function reduceData(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'post/add':
      return { ...state, posts: [action.post, ...state.posts] };
    case 'reel/add':
      return { ...state, reels: [action.reel, ...state.reels] };
    case 'quiz/add':
      return { ...state, quizzes: [...state.quizzes, action.quiz] };
    case 'pod/add':
      return { ...state, pods: [...state.pods, action.pod] };
    case 'content/toggle':
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.id ? { ...p, [action.field]: !p[action.field] } : p,
        ),
        reels: state.reels.map((p) =>
          p.id === action.id ? { ...p, [action.field]: !p[action.field] } : p,
        ),
      };
    case 'content/share':
      return {
        ...state,
        posts: state.posts.map((p) => (p.id === action.id ? { ...p, shares: p.shares + 1 } : p)),
        reels: state.reels.map((p) => (p.id === action.id ? { ...p, shares: p.shares + 1 } : p)),
      };
    case 'comment/add':
      return { ...state, comments: [...state.comments, action.comment] };
    case 'profile/update':
      return { ...state, profile: action.profile };
    case 'account/follow':
      if (action.id === state.profile.id || !state.accounts.some((a) => a.id === action.id))
        return state;
      return {
        ...state,
        following: state.following.includes(action.id)
          ? state.following.filter((id) => id !== action.id)
          : [...state.following, action.id],
      };
    case 'session/complete':
      return state.completedSessions.includes(action.id)
        ? state
        : { ...state, completedSessions: [...state.completedSessions, action.id] };
    case 'quiz/complete': {
      const quiz = state.quizzes.find((q) => q.id === action.id);
      if (
        !quiz ||
        action.answers.length !== quiz.questions.length ||
        action.answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)
      )
        return state;
      const score = quiz.questions.filter(
        (q, index) => q.correctIndex === action.answers[index],
      ).length;
      const best = Math.max(state.quizResults[quiz.id]?.score ?? 0, score);
      return {
        ...state,
        quizResults: {
          ...state.quizResults,
          [quiz.id]: { score: best, total: quiz.questions.length },
        },
      };
    }
    case 'draft/save':
      return { ...state, draft: action.text };
    case 'settings/update':
      return { ...state, settings: action.settings };
    case 'data/replace':
      return action.data;
  }
}
