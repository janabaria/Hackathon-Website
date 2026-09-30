import { ReelPreview } from '../components/ReelPreview';
import { NoteEditor } from '../components/NoteEditor';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Plus, CalendarDays, FileText, Save, Paperclip } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { newId } from '../lib/utils';
import type { Notebook } from '../domain/schema';
import { sectionPages, withPages, type Section, type NotePage } from '../domain/notebooks';
import { Modal, PageHeader, EmptyState, Topic } from '../components/ui';
import { DeleteButton } from '../components/DeleteButton';

export function NotebooksPage() {
  const { data, commit, notify, pending } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  return (
    <>
      <PageHeader
        eyebrow="MAKE KNOWLEDGE YOURS"
        title="My notebooks"
        description="Collect discoveries. Connect ideas. Come back stronger."
        action={
          <Link className="button secondary" to="/calendar">
            <CalendarDays size={18} />
            Exam calendar
          </Link>
        }
      />
      <button className="button primary" onClick={() => setOpen(true)}>
        <Plus size={18} />
        New notebook
      </button>
      <div className="notebook-library">
        {data.notebooks.map((n, i) => (
          <article className="notebook-tile" key={n.id}>
            <Link to={`/notebooks/${n.id}`} className="notebook-tile-link">
              <span className={`notebook-cover topic-${i % 5}`}>
                <BookOpen size={52} />
              </span>
              <h2>{n.title}</h2>
              <p>
                {n.sections.length} {n.sections.length === 1 ? 'section' : 'sections'}
              </p>
              <small>{n.subject}</small>
            </Link>
            <DeleteButton label="notebook" action={{ type: 'notebook/delete', id: n.id }} />
          </article>
        ))}
      </div>
      {!data.notebooks.length && (
        <EmptyState
          icon={BookOpen}
          title="Your ideas belong together."
          description="Create a subject notebook and add sections, notes, and saved learning."
        />
      )}
      {open && (
        <Modal title="Create a notebook" onClose={() => !pending && setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await commit({
                  type: 'notebook/save',
                  notebook: {
                    id: newId(),
                    title: title.trim(),
                    subject: subject.trim(),
                    createdAt: new Date().toISOString(),
                    sections: [],
                  },
                })
              ) {
                setOpen(false);
                setTitle('');
                setSubject('');
                notify('Notebook created successfully.');
              }
            }}
          >
            <label>
              Notebook name
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Subject
              <input
                required
                maxLength={120}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <button disabled={pending} className="button primary">
              Create notebook
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function NotebookPage() {
  const { id } = useParams();
  const { data, commit, notify, pending } = useApp();
  const notebook = data.notebooks.find((n) => n.id === id);
  const [selection, setSelection] = useState({ section: '', page: '' });
  const [dirty, setDirty] = useState(false);
  const [renaming, setRenaming] = useState<'notebook' | 'section' | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameSubject, setRenameSubject] = useState('');
  const [adding, setAdding] = useState<'section' | 'page' | null>(null);
  const [name, setName] = useState('');
  const choose = (section: string, page = '') => {
    if (!dirty || window.confirm('You have unsaved notes. Discard changes?')) {
      setDirty(false);
      setSelection({ section, page });
    }
  };
  if (!notebook)
    return (
      <EmptyState
        icon={BookOpen}
        title="Notebook not found"
        description="It may have been removed."
        action={<Link to="/notebooks">My notebooks</Link>}
      />
    );
  const section = notebook.sections.find((s) => s.id === selection.section) ?? notebook.sections[0];
  const pages = section ? sectionPages(section) : [];
  const page = pages.find((p) => p.id === selection.page) ?? pages[0];
  const saveBook = async (next: Notebook, message: string) => {
    if (await commit({ type: 'notebook/save', notebook: next })) {
      notify(message);
      return true;
    }
    return false;
  };
  return (
    <>
      <Link
        className="back-link"
        to="/notebooks"
        onClick={(e) => {
          if (dirty && !window.confirm('Discard unsaved notes?')) e.preventDefault();
        }}
      >
        ← My notebooks
      </Link>
      <div className="notebook-titlebar">
        <BookOpen />
        <div>
          <h1>{notebook.title}</h1>
          <button
            className="text-button"
            onClick={() => {
              setRenameTitle(notebook.title);
              setRenameSubject(notebook.subject);
              setRenaming('notebook');
            }}
          >
            Edit notebook
          </button>
          <small>{notebook.subject}</small>
        </div>
        <Link className="button secondary" to={`/interact?notebook=${notebook.id}`}>
          Create a quiz
        </Link>
      </div>
      {renaming && (
        <Modal
          title={renaming === 'notebook' ? 'Edit notebook' : 'Rename section'}
          onClose={() => setRenaming(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (dirty) {
                notify('Save your page before renaming.');
                return;
              }
              const next =
                renaming === 'notebook'
                  ? { ...notebook, title: renameTitle.trim(), subject: renameSubject.trim() }
                  : {
                      ...notebook,
                      sections: notebook.sections.map((s) =>
                        s.id === section.id ? { ...s, title: renameTitle.trim() } : s,
                      ),
                    };
              if (await saveBook(next, 'Changes saved.')) setRenaming(null);
            }}
          >
            <label>
              Name
              <input
                required
                maxLength={120}
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
              />
            </label>
            {renaming === 'notebook' && (
              <label>
                Subject
                <input
                  required
                  maxLength={120}
                  value={renameSubject}
                  onChange={(e) => setRenameSubject(e.target.value)}
                />
              </label>
            )}
            <button className="button primary" disabled={pending}>
              Save changes
            </button>
          </form>
        </Modal>
      )}
      <div className="notebook-workspace">
        <aside className="notebook-section-nav">
          <h3>Sections</h3>
          {section && (
            <button
              className="text-button"
              onClick={() => {
                setRenameTitle(section.title);
                setRenaming('section');
              }}
            >
              Rename section
            </button>
          )}
          {notebook.sections.map((s, i) => (
            <button
              key={s.id}
              aria-pressed={s.id === section?.id}
              className="notebook-nav-item"
              onClick={() => choose(s.id)}
            >
              <span className={`section-marker topic-${i % 5}`} />
              {s.title}
            </button>
          ))}
          <button
            className="text-button"
            disabled={pending || notebook.sections.length >= 50}
            onClick={() => {
              setName('');
              setAdding('section');
            }}
          >
            <Plus size={16} />
            New section
          </button>
        </aside>
        <aside className="notebook-page-nav">
          <h3>Pages</h3>
          {pages.map((p) => (
            <button
              key={p.id}
              aria-pressed={p.id === page?.id}
              className="notebook-nav-item"
              onClick={() => choose(section.id, p.id)}
            >
              <FileText size={15} />
              {p.title}
            </button>
          ))}
          {section && (
            <button
              className="text-button"
              disabled={pending || pages.length >= 100}
              onClick={() => {
                setName('');
                setAdding('page');
              }}
            >
              <Plus size={16} />
              Add page
            </button>
          )}
        </aside>
        {section && page ? (
          <NotebookEditor
            key={`${notebook.id}:${section.id}:${page.id}`}
            notebook={notebook}
            section={section}
            page={page}
            dirtyChange={setDirty}
            save={async (next) => {
              if (
                await saveBook(
                  {
                    ...notebook,
                    sections: notebook.sections.map((s) =>
                      s.id === section.id
                        ? withPages(
                            s,
                            pages.map((p) => (p.id === next.id ? next : p)),
                          )
                        : s,
                    ),
                  },
                  'Notes saved successfully.',
                )
              ) {
                setDirty(false);
                return true;
              }
              return false;
            }}
          />
        ) : (
          <div className="notebook-paper">
            <EmptyState
              icon={BookOpen}
              title="Start with one section."
              description="Add a section on the left, then create a page for your notes."
            />
          </div>
        )}
      </div>
      {adding && (
        <Modal
          title={adding === 'section' ? 'New section' : 'Add page'}
          onClose={() => !pending && setAdding(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (dirty && !window.confirm('Discard unsaved notes before switching?')) return;
              const pid = newId();
              const newPage = {
                id: pid,
                title: adding === 'section' ? 'Untitled page' : name.trim(),
                notes: '',
                contentIds: [],
              };
              const sid = adding === 'section' ? newId() : section.id;
              const sections =
                adding === 'section'
                  ? [
                      ...notebook.sections,
                      { id: sid, title: name.trim(), notes: '', contentIds: [], pages: [newPage] },
                    ]
                  : notebook.sections.map((s) =>
                      s.id === sid ? withPages(s, [...sectionPages(s), newPage]) : s,
                    );
              if (
                await saveBook(
                  { ...notebook, sections },
                  adding === 'section'
                    ? 'Section created successfully.'
                    : 'Page created successfully.',
                )
              ) {
                setDirty(false);
                setSelection({ section: sid, page: pid });
                setAdding(null);
              }
            }}
          >
            <label>
              Title
              <input
                autoFocus
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={pending}>
              Create
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function NotebookEditor({
  notebook,
  section,
  page,
  save,
  dirtyChange,
}: {
  notebook: Notebook;
  section: Section;
  page: NotePage;
  save: (page: NotePage) => Promise<boolean>;
  dirtyChange: (dirty: boolean) => void;
}) {
  const { data, commit, notify, pending } = useApp();
  const [draft, setDraft] = useState(page);
  const [saved, setSaved] = useState(page);
  const [attach, setAttach] = useState(false);
  const [deleting, setDeleting] = useState<'page' | 'section' | null>(null);
  const change = (next: NotePage) => {
    setDraft(next);
    dirtyChange(JSON.stringify(next) !== JSON.stringify(saved));
  };
  return (
    <section className="notebook-paper">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save(draft)) setSaved(draft);
        }}
      >
        <div className="notebook-toolbar">
          <button type="button" className="text-button" onClick={() => setAttach(true)}>
            <Paperclip size={16} />
            Attach
          </button>
          <button
            className="button primary"
            disabled={pending || JSON.stringify(saved) === JSON.stringify(draft)}
          >
            <Save size={16} />
            Save page
          </button>
        </div>
        <input
          className="note-page-title"
          aria-label="Page title"
          required
          maxLength={120}
          value={draft.title}
          onChange={(e) => change({ ...draft, title: e.target.value })}
        />
        <small>
          {new Date(notebook.createdAt).toLocaleDateString(data.settings.language)} ·{' '}
          {JSON.stringify(saved) === JSON.stringify(draft) ? 'Saved' : 'Unsaved changes'}
        </small>
        <NoteEditor
          notes={draft.notes}
          html={draft.html}
          onChange={(notes, html) => change({ ...draft, notes, html })}
        />
        <div className="note-attachments">
          {draft.contentIds.map((id) => {
            const c = [...data.posts, ...data.reels].find((p) => p.id === id);
            return (
              <div className="attachment-card" key={id}>
                {c ? (
                  <Link to={'title' in c ? `/reels?id=${id}` : `/search?content=${id}`}>
                    {c.videoUrl && (
                      <ReelPreview
                        reel={{
                          title: 'title' in c ? c.title : c.caption.slice(0, 80),
                          topic: c.topic,
                          videoUrl: c.videoUrl,
                          thumbnail: c.thumbnail,
                        }}
                      />
                    )}
                    <Topic topic={c.topic} />
                    <strong>{'title' in c ? c.title : c.caption.slice(0, 120)}</strong>
                  </Link>
                ) : (
                  <span>Content no longer available.</span>
                )}
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    change({ ...draft, contentIds: draft.contentIds.filter((x) => x !== id) })
                  }
                >
                  Remove attachment
                </button>
              </div>
            );
          })}
        </div>
        <div className="button-row">
          <button
            type="button"
            className="text-button danger-text"
            onClick={() => setDeleting('page')}
          >
            Delete page
          </button>
          <button
            type="button"
            className="text-button danger-text"
            onClick={() => setDeleting('section')}
          >
            Delete section
          </button>
        </div>
      </form>
      {attach && (
        <Modal title="Attach saved learning" onClose={() => setAttach(false)}>
          <div className="notebook-picker">
            {[...data.posts, ...data.reels]
              .filter((c) => c.saved || c.liked)
              .map((c) => (
                <label className="attachment-choice" key={c.id}>
                  <input
                    type="checkbox"
                    checked={draft.contentIds.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked && draft.contentIds.length >= 100) return;
                      change({
                        ...draft,
                        contentIds: e.target.checked
                          ? [...draft.contentIds, c.id]
                          : draft.contentIds.filter((x) => x !== c.id),
                      });
                    }}
                  />
                  <span>{'title' in c ? c.title : c.caption.slice(0, 120)}</span>
                </label>
              ))}
          </div>
          <button
            className="button primary"
            disabled={pending}
            onClick={async () => {
              if (await save(draft)) {
                setSaved(draft);
                setAttach(false);
                notify('Attachments saved successfully.');
              }
            }}
          >
            Save attachments
          </button>
        </Modal>
      )}
      {deleting && (
        <Modal title={`Delete ${deleting}?`} onClose={() => !pending && setDeleting(null)}>
          <p>This removes the selected {deleting} and its notes.</p>
          <button
            className="button danger"
            disabled={pending}
            onClick={async () => {
              const rest = sectionPages(section).filter((p) => p.id !== page.id);
              const sections =
                deleting === 'section'
                  ? notebook.sections.filter((s) => s.id !== section.id)
                  : notebook.sections.map((s) =>
                      s.id === section.id
                        ? withPages(
                            s,
                            rest.length
                              ? rest
                              : [
                                  {
                                    id: newId(),
                                    title: 'Untitled page',
                                    notes: '',
                                    contentIds: [],
                                  },
                                ],
                          )
                        : s,
                    );
              if (await commit({ type: 'notebook/save', notebook: { ...notebook, sections } })) {
                dirtyChange(false);
                setDeleting(null);
                notify('Deleted successfully.');
              }
            }}
          >
            Delete permanently
          </button>
        </Modal>
      )}
    </section>
  );
}
