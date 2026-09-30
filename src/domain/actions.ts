import type {
  Maze,
  AppData,
  Comment,
  Pod,
  Post,
  Profile,
  Quiz,
  Reel,
  Notebook,
  Exam,
} from './schema';

export type Action =
  | {
      type: 'content/edit';
      id: string;
      changes: {
        caption: string;
        topic: string;
        title?: string;
        thumbnail?: string;
        image?: string;
        videoUrl?: string;
      };
    }
  | { type: 'comment/edit'; id: string; text: string }
  | { type: 'pod/edit'; pod: Pod }
  | { type: 'quiz/edit'; quiz: Quiz }
  | { type: 'quiz/delete'; id: string }
  | { type: 'maze/save'; maze: Maze }
  | { type: 'maze/delete'; id: string }
  | { type: 'notebook/save'; notebook: Notebook }
  | { type: 'notebook/delete'; id: string }
  | { type: 'exam/save'; exam: Exam }
  | { type: 'exam/delete'; id: string }
  | { type: 'reminder/dismiss'; id: string }
  | { type: 'content/delete'; id: string }
  | { type: 'comment/delete'; id: string }
  | { type: 'comment/like'; id: string }
  | { type: 'pod/delete'; id: string }
  | { type: 'pod/request'; podId: string }
  | { type: 'pod/respond'; podId: string; userId: string; status: 'approved' | 'rejected' }
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
    case 'maze/save': {
      const old = state.mazes.find((m) => m.id === action.maze.id);
      if (action.maze.authorId !== state.profile.id || (old && old.authorId !== state.profile.id))
        throw new Error('You can only edit your own games.');
      return {
        ...state,
        mazes: [...state.mazes.filter((m) => m.id !== action.maze.id), action.maze],
      };
    }
    case 'maze/delete':
      if (!state.mazes.some((m) => m.id === action.id && m.authorId === state.profile.id))
        throw new Error('You can only delete your own games.');
      return { ...state, mazes: state.mazes.filter((m) => m.id !== action.id) };
    case 'quiz/delete':
      if (
        !state.quizzes.some(
          (q) => q.id === action.id && (q.authorId ?? state.profile.id) === state.profile.id,
        )
      )
        throw new Error('You can only delete your own quizzes.');
      return {
        ...state,
        quizzes: state.quizzes.filter((q) => q.id !== action.id),
        quizResults: Object.fromEntries(
          Object.entries(state.quizResults).filter(([id]) => id !== action.id),
        ),
      };

    case 'content/edit': {
      const c = [...state.posts, ...state.reels].find((c) => c.id === action.id);
      if (!c || c.authorId !== state.profile.id)
        throw new Error('You can only edit your own content.');
      return {
        ...state,
        posts: state.posts.map((p) => (p.id === action.id ? { ...p, ...action.changes } : p)),
        reels: state.reels.map((p) => (p.id === action.id ? { ...p, ...action.changes } : p)),
      };
    }
    case 'comment/edit':
      if (!state.comments.some((c) => c.id === action.id && c.authorId === state.profile.id))
        throw new Error('You can only edit your own comments.');
      return {
        ...state,
        comments: state.comments.map((c) => (c.id === action.id ? { ...c, text: action.text } : c)),
      };
    case 'pod/edit':
      if (
        !state.pods.some(
          (p) => p.id === action.pod.id && (p.authorId ?? state.profile.id) === state.profile.id,
        )
      )
        throw new Error('You can only edit your own pods.');
      return {
        ...state,
        pods: state.pods.map((p) =>
          p.id === action.pod.id ? { ...action.pod, authorId: p.authorId } : p,
        ),
      };
    case 'quiz/edit':
      if (
        !state.quizzes.some(
          (q) => q.id === action.quiz.id && (q.authorId ?? state.profile.id) === state.profile.id,
        )
      )
        throw new Error('You can only edit your own quizzes.');
      return {
        ...state,
        quizzes: state.quizzes.map((q) =>
          q.id === action.quiz.id ? { ...action.quiz, authorId: q.authorId } : q,
        ),
        quizResults: Object.fromEntries(
          Object.entries(state.quizResults).filter(([id]) => id !== action.quiz.id),
        ),
      };
    case 'notebook/save':
      return {
        ...state,
        notebooks: [...state.notebooks.filter((n) => n.id !== action.notebook.id), action.notebook],
      };

    case 'notebook/delete':
      return { ...state, notebooks: state.notebooks.filter((n) => n.id !== action.id) };

    case 'exam/save':
      return {
        ...state,
        exams: [...state.exams.filter((n) => n.id !== action.exam.id), action.exam],
      };

    case 'exam/delete':
      return { ...state, exams: state.exams.filter((n) => n.id !== action.id) };

    case 'reminder/dismiss':
      return {
        ...state,
        dismissedReminders: [...new Set([...state.dismissedReminders, action.id])],
      };

    case 'content/delete': {
      const content = [...state.posts, ...state.reels].find((p) => p.id === action.id);

      if (!content || content.authorId !== state.profile.id)
        throw new Error('You can only delete your own content.');

      return {
        ...state,
        posts: state.posts.filter((p) => p.id !== action.id),
        reels: state.reels.filter((p) => p.id !== action.id),
        comments: state.comments.filter((c) => c.contentId !== action.id),
      };
    }

    case 'comment/delete':
      if (!state.comments.some((c) => c.id === action.id && c.authorId === state.profile.id))
        throw new Error('You can only delete your own discussion.');

      return {
        ...state,
        comments: state.comments
          .filter((c) => c.id !== action.id)
          .map((c) => (c.parentId === action.id ? { ...c, parentId: undefined } : c)),
      };

    case 'pod/delete':
      if (
        !state.pods.some(
          (p) => p.id === action.id && (p.authorId ?? state.profile.id) === state.profile.id,
        )
      )
        throw new Error('You can only delete your own pod.');

      return {
        ...state,
        pods: state.pods.filter((p) => p.id !== action.id),
        podRequests: state.podRequests.filter((r) => r.podId !== action.id),
      };

    case 'pod/request': {
      const pod = state.pods.find((p) => p.id === action.podId);

      if (
        !pod ||
        pod.authorId === state.profile.id ||
        state.podRequests.some((r) => r.podId === pod.id && r.userId === state.profile.id)
      )
        return state;

      return {
        ...state,
        podRequests: [
          ...state.podRequests,
          { podId: pod.id, userId: state.profile.id, status: 'pending' },
        ],
      };
    }

    case 'pod/respond':
      if (!state.pods.some((p) => p.id === action.podId && p.authorId === state.profile.id))
        throw new Error('Only the pod creator can review requests.');

      return {
        ...state,
        podRequests: state.podRequests.map((r) =>
          r.podId === action.podId && r.userId === action.userId
            ? { ...r, status: action.status }
            : r,
        ),
      };

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
          p.id === action.id
            ? {
                ...p,
                [action.field]: !p[action.field],
                ...(action.field === 'liked'
                  ? {
                      likeCount: Math.max(0, (p.likeCount ?? Number(p.liked)) + (p.liked ? -1 : 1)),
                    }
                  : {}),
              }
            : p,
        ),

        reels: state.reels.map((p) =>
          p.id === action.id
            ? {
                ...p,
                [action.field]: !p[action.field],
                ...(action.field === 'liked'
                  ? {
                      likeCount: Math.max(0, (p.likeCount ?? Number(p.liked)) + (p.liked ? -1 : 1)),
                    }
                  : {}),
              }
            : p,
        ),
      };

    case 'content/share':
      return {
        ...state,

        posts: state.posts.map((p) => (p.id === action.id ? { ...p, shares: p.shares + 1 } : p)),

        reels: state.reels.map((p) => (p.id === action.id ? { ...p, shares: p.shares + 1 } : p)),
      };

    case 'comment/like':
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.id
            ? {
                ...c,
                liked: !c.liked,
                likeCount: Math.max(0, (c.likeCount ?? Number(!!c.liked)) + (c.liked ? -1 : 1)),
              }
            : c,
        ),
      };
    case 'comment/add':
      if (
        action.comment.parentId &&
        !state.comments.some(
          (c) => c.id === action.comment.parentId && c.contentId === action.comment.contentId,
        )
      )
        throw new Error('The comment you replied to is no longer available.');
      return { ...state, comments: [...state.comments, action.comment] };

    case 'profile/update':
      return { ...state, profile: action.profile };

    case 'account/follow':
      if (action.id === state.profile.id || !state.accounts.some((a) => a.id === action.id))
        return state;

      return {
        ...state,

        followEdges: state.following.includes(action.id)
          ? state.followEdges.filter(
              (edge) => !(edge.userId === state.profile.id && edge.targetId === action.id),
            )
          : [...state.followEdges, { userId: state.profile.id, targetId: action.id }],
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
