import type { Notebook } from './schema';
import { newId } from '../lib/utils';
export type Section = Notebook['sections'][number];
export type NotePage = NonNullable<Section['pages']>[number];
export function sectionPages(section: Section): NotePage[] {
  return section.pages?.length
    ? section.pages
    : [
        {
          id: `page-${section.id}`,
          title: section.title,
          notes: section.notes,
          contentIds: section.contentIds,
        },
      ];
}
export function withPages(section: Section, pages: NotePage[]): Section {
  return {
    ...section,
    pages,
    notes: pages
      .map((p) => p.notes)
      .join('\n\n')
      .slice(0, 12000),
    contentIds: [...new Set(pages.flatMap((p) => p.contentIds))].slice(0, 100),
  };
}
export function attachLearning(
  notebook: Notebook,
  contentId: string,
  sectionId?: string,
): Notebook {
  let sections = notebook.sections;
  if (!sections.length)
    sections = [{ id: newId(), title: 'Saved learning', notes: '', contentIds: [] }];
  const target = sections.find((s) => s.id === sectionId) ?? sections[0];
  const pages = [...sectionPages(target)];
  if (target.contentIds.includes(contentId) || pages.some((p) => p.contentIds.includes(contentId)))
    return notebook.sections.length ? notebook : { ...notebook, sections };
  if (target.contentIds.length >= 100)
    throw new Error('This section already has 100 attachments. Choose another section.');
  pages[0] = { ...pages[0], contentIds: [...pages[0].contentIds, contentId] };
  return {
    ...notebook,
    sections: sections.map((s) => (s.id === target.id ? withPages(s, pages) : s)),
  };
}
