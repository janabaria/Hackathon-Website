import { it, expect } from 'vitest';
import { attachLearning, sectionPages, withPages } from './notebooks';
import { notebookSchema, profileSchema } from './schema';
const oldBook = {
  id: 'n',
  title: 'Biology',
  subject: 'Cells',
  createdAt: '2026-09-29T00:00:00Z',
  sections: [{ id: 's', title: 'Chapter 1', notes: 'Keep this note', contentIds: ['old'] }],
};
it('opens legacy sections as pages without dropping notes or attachments', () => {
  expect(sectionPages(oldBook.sections[0])[0]).toMatchObject({
    notes: 'Keep this note',
    contentIds: ['old'],
  });
});
it('attaches once and does not mutate the saved notebook', () => {
  const book = {
    ...oldBook,
    sections: [withPages(oldBook.sections[0], sectionPages(oldBook.sections[0]))],
  };
  const added = attachLearning(book, 'new', 's');
  expect(book.sections[0].pages![0].contentIds).toEqual(['old']);
  expect(added.sections[0].contentIds).toEqual(['old', 'new']);
  expect(attachLearning(added, 'new', 's')).toEqual(added);
  expect(notebookSchema.parse(added)).toEqual(added);
});
it('creates a section and page when attaching to an empty notebook', () => {
  const added = attachLearning({ ...oldBook, sections: [] }, 'r1');
  expect(sectionPages(added.sections[0])[0].contentIds).toEqual(['r1']);
});
it('preserves a valid profile photo and rejects unsafe image sources', () => {
  const person = {
    id: 'p',
    name: 'A',
    bio: '',
    interests: [],
    skills: [],
    avatar: 'data:image/png;base64,aGVsbG8=',
  };
  expect(profileSchema.parse(person).avatar).toBe(person.avatar);
  expect(profileSchema.safeParse({ ...person, avatar: 'javascript:alert(1)' }).success).toBe(false);
});

it('preserves rich formatting while keeping plain notes for AI and search', () => {
  const page = {
    ...sectionPages(oldBook.sections[0])[0],
    notes: 'A colorful note',
    html: '<div><span style="color:#ff0000">A colorful note</span></div>',
  };
  const book = { ...oldBook, sections: [withPages(oldBook.sections[0], [page])] };
  expect(notebookSchema.parse(book).sections[0].pages?.[0].html).toBe(page.html);
  expect(book.sections[0].notes).toBe('A colorful note');
});
