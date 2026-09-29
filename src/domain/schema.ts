import { z } from 'zod';
const id = z.string().min(1).max(100);
const shortText = z.string().trim().min(1).max(120);
const imageSource = z
  .string()
  .refine(
    (value) =>
      value === '' ||
      /^https?:\/\//i.test(value) ||
      /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value),
    'Use an HTTP image URL or an uploaded PNG, JPEG, WebP, or GIF.',
  );
export const profileSchema = z.object({
  id,
  name: z.string().trim().max(80),
  bio: z.string().max(600),
  avatar: imageSource.default(''),
  interests: z.array(shortText).max(20),
  skills: z.array(shortText).max(20),
});
const contentFields = {
  id,
  authorId: id,
  thumbnail: imageSource.refine((v) => v.length <= 1500000, 'Thumbnail is too large.').optional(),
  topic: shortText,
  caption: z.string().trim().min(1).max(2000),
  createdAt: z.string().datetime(),
  liked: z.boolean(),
  likeCount: z.number().int().nonnegative().optional(),
  saved: z.boolean(),
  shares: z.number().int().nonnegative(),
};
export const postSchema = z.object({
  ...contentFields,
  image: imageSource,
  videoUrl: z
    .string()
    .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Use an HTTP(S) video URL.')
    .optional(),
});
export const reelSchema = z.object({
  ...contentFields,
  title: shortText,
  videoUrl: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP(S) video URL.'),
});
export const commentSchema = z.object({
  createdAt: z.string().datetime().optional(),
  liked: z.boolean().optional(),
  likeCount: z.number().int().nonnegative().optional(),
  id,
  contentId: id,
  authorId: id,
  text: z.string().trim().min(1).max(500),
});
export const questionSchema = z
  .object({
    id,
    prompt: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(300)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().max(1000),
  })
  .refine((q) => new Set(q.options).size === 4, 'The four answers must be different.');
export const quizSchema = z.object({
  id,
  authorId: id.optional(),
  game: z
    .object({
      mode: z.enum(['blocks', 'cards']),
      title: shortText,
      instructions: z.string().max(500),
    })
    .optional(),
  title: shortText,
  topic: shortText,
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  questions: z.array(questionSchema).min(1).max(20),
});
export const podSchema = z.object({
  id,
  authorId: id.optional(),
  visibility: z.enum(['public', 'private']).default('private'),
  title: shortText,
  goal: z.string().trim().min(1).max(500),
  vibe: z.enum(['Quiet focus', 'Practice', 'Explain an idea']),
  minutes: z.number().int().min(1).max(120),
});
export const notebookSchema = z.object({
  id,
  title: shortText,
  subject: shortText,
  createdAt: z.string().datetime(),
  sections: z
    .array(
      z.object({
        id,
        title: shortText,
        notes: z.string().max(12000),
        contentIds: z.array(id).max(100),
        pages: z
          .array(
            z.object({
              id,
              title: shortText,
              notes: z.string().max(12000),
              contentIds: z.array(id).max(100),
            }),
          )
          .max(100)
          .optional(),
      }),
    )
    .max(50),
});
export const examSchema = z.object({
  id,
  title: shortText,
  subject: shortText,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reminderDays: z.number().int().min(0).max(30),
});
export const podRequestSchema = z.object({
  podId: id,
  userId: id,
  status: z.enum(['pending', 'approved', 'rejected']),
});
export type Notebook = z.infer<typeof notebookSchema>;
export type Exam = z.infer<typeof examSchema>;
export const dataSchema = z
  .object({
    version: z.literal(1),
    profile: profileSchema,
    accounts: z.array(profileSchema),
    posts: z.array(postSchema),
    reels: z.array(reelSchema),
    quizzes: z.array(quizSchema),
    pods: z.array(podSchema),
    podRequests: z.array(podRequestSchema).default([]),
    notebooks: z.array(notebookSchema).default([]),
    exams: z.array(examSchema).default([]),
    dismissedReminders: z.array(id).default([]),
    comments: z.array(commentSchema),
    following: z.array(id),
    completedSessions: z.array(id),
    quizResults: z.record(
      z.string(),
      z.object({ score: z.number().int().nonnegative(), total: z.number().int().positive() }),
    ),
    draft: z.string().max(2000),
    settings: z.object({
      theme: z.enum(['light', 'dark']),
      followDeviceTheme: z.boolean().default(true),
      roomyText: z.boolean(),
      accentColor: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .default('#6754df'),
      language: z.enum(['en', 'ar']).default('en'),
    }),
  })
  .superRefine((data, ctx) => {
    const people = [data.profile, ...data.accounts].map((p) => p.id);
    const content = [...data.posts, ...data.reels];
    const ids = [
      ...people,
      ...content.map((p) => p.id),
      ...data.quizzes.map((q) => q.id),
      ...data.pods.map((p) => p.id),
      ...data.comments.map((c) => c.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Every record must have a unique ID.' });
    if (
      content.some((p) => !people.includes(p.authorId)) ||
      data.comments.some((c) => !people.includes(c.authorId))
    ) {
      ctx.addIssue({ code: 'custom', message: 'A content author is missing from the profiles.' });
    }
    if (data.comments.some((c) => !content.some((p) => p.id === c.contentId)))
      ctx.addIssue({ code: 'custom', message: 'A comment refers to missing content.' });
    if (data.following.some((person) => person === data.profile.id || !people.includes(person)))
      ctx.addIssue({ code: 'custom', message: 'A followed account is invalid.' });
    if (
      Object.entries(data.quizResults).some(
        ([key, r]) =>
          !data.quizzes.some((q) => q.id === key && q.questions.length === r.total) ||
          r.score > r.total,
      )
    ) {
      ctx.addIssue({ code: 'custom', message: 'A quiz result does not match a quiz.' });
    }
  });
export type Profile = z.infer<typeof profileSchema>;
export type Post = z.infer<typeof postSchema>;
export type Reel = z.infer<typeof reelSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type Pod = z.infer<typeof podSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type AppData = z.infer<typeof dataSchema>;
/** The only initial content: an unconfigured local profile and empty collections. */
export function createEmptyData(): AppData {
  return {
    version: 1,
    profile: { id: 'local-profile', name: '', bio: '', avatar: '', interests: [], skills: [] },
    accounts: [],
    posts: [],
    reels: [],
    quizzes: [],
    pods: [],
    podRequests: [],
    notebooks: [],
    exams: [],
    dismissedReminders: [],
    comments: [],
    following: [],
    completedSessions: [],
    quizResults: {},
    draft: '',
    settings: {
      theme: 'light',
      followDeviceTheme: true,
      roomyText: false,
      accentColor: '#6754df',
      language: 'en',
    },
  };
}
