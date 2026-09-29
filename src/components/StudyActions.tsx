import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Users } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Modal } from './ui';
import type { Post, Reel } from '../domain/schema';
import { attachLearning } from '../domain/notebooks';
import { newId } from '../lib/utils';
export function StudyActions({ content, onClose }: { content: Post | Reel; onClose: () => void }) {
  const { data, commit, notify, pending } = useApp();
  const [view, setView] = useState<'choose' | 'notebooks' | 'new'>('choose');
  const [selected, setSelected] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(content.topic);
  const [error, setError] = useState('');
  const notebook = data.notebooks.find((n) => n.id === selected);
  const save = async (id: string) => {
    const existing = data.notebooks.find((n) => n.id === id);
    if (!existing) return;
    try {
      if (
        await commit({
          type: 'notebook/save',
          notebook: attachLearning(existing, content.id, sectionId),
        })
      ) {
        notify('Added to notebook successfully.');
        onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal title="Study this" onClose={() => !pending && onClose()}>
      <p className="muted">Turn this discovery into a learning plan.</p>
      {view === 'choose' ? (
        <div className="study-options">
          <Link
            className="card study-option"
            to={`/?tab=pods&goal=${encodeURIComponent(content.caption)}`}
            onClick={onClose}
          >
            <Users />
            <strong>Create pod</strong>
            <small>Explore this idea with others</small>
          </Link>
          <button className="card study-option" onClick={() => setView('notebooks')}>
            <BookOpen />
            <strong>Add to notebook</strong>
            <small>Keep it with your notes</small>
          </button>
        </div>
      ) : view === 'notebooks' ? (
        <>
          <div className="notebook-picker">
            {data.notebooks.map((n) => (
              <button
                key={n.id}
                className={`notebook-choice ${selected === n.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelected(n.id);
                  setSectionId(n.sections[0]?.id ?? '');
                }}
              >
                <BookOpen />
                <span>
                  <strong>{n.title}</strong>
                  <small>
                    {n.sections.length} sections · {n.subject}
                  </small>
                </span>
              </button>
            ))}
            {!data.notebooks.length && <p>No notebooks yet. Create your first one below.</p>}
          </div>
          {notebook && (
            <>
              <label>
                Section
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                  {notebook.sections.length ? (
                    notebook.sections.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.title}
                      </option>
                    ))
                  ) : (
                    <option value="">New saved learning section</option>
                  )}
                </select>
              </label>
              <button
                className="button primary"
                disabled={pending}
                onClick={() => void save(notebook.id)}
              >
                Add to notebook
              </button>
            </>
          )}
          <button
            className="button secondary full-width new-notebook-choice"
            onClick={() => setView('new')}
          >
            <Plus size={18} />
            Create new notebook
          </button>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const created = {
              id: newId(),
              title: title.trim(),
              subject: subject.trim(),
              createdAt: new Date().toISOString(),
              sections: [],
            };
            if (
              await commit({ type: 'notebook/save', notebook: attachLearning(created, content.id) })
            ) {
              notify('Notebook created and content added successfully.');
              onClose();
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
            Create and add
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </Modal>
  );
}
