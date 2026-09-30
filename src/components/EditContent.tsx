import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Modal } from './ui';
import { VideoThumbnail } from './VideoThumbnail';
import type { Post, Reel, Comment, Pod } from '../domain/schema';
export function EditContentButton({ content }: { content: Post | Reel }) {
  const { commit, notify, pending } = useApp();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState(content.caption),
    [topic, setTopic] = useState(content.topic),
    [title, setTitle] = useState('title' in content ? content.title : ''),
    [thumbnail, setThumbnail] = useState(content.thumbnail ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="text-button"
        aria-label={'title' in content ? 'Edit reel' : 'Edit post'}
        onClick={() => {
          setCaption(content.caption);
          setTopic(content.topic);
          setTitle('title' in content ? content.title : '');
          setThumbnail(content.thumbnail ?? '');
          setOpen(true);
        }}
      >
        <Pencil size={16} />
        Edit
      </button>
      {open && (
        <Modal
          title={'title' in content ? 'Edit reel' : 'Edit post'}
          onClose={() => !pending && !busy && setOpen(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              if (
                await commit({
                  type: 'content/edit',
                  id: content.id,
                  changes: {
                    caption: caption.trim(),
                    topic: topic.trim(),
                    thumbnail,
                    ...('title' in content ? { title: title.trim() } : {}),
                  },
                })
              ) {
                notify('Changes saved.');
                setOpen(false);
              }
            }}
          >
            {'title' in content && (
              <label>
                Title
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            )}
            <label>
              Topic
              <input
                required
                maxLength={120}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>
            <label>
              Caption
              <textarea
                required
                maxLength={2000}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            {content.videoUrl && (
              <VideoThumbnail value={thumbnail} onChange={setThumbnail} onBusy={setBusy} />
            )}
            <button className="button primary" disabled={pending || busy}>
              Save changes
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function EditCommentButton({ comment }: { comment: Comment }) {
  const { commit, notify, pending } = useApp();
  const [editing, setEditing] = useState(false),
    [text, setText] = useState(comment.text);
  return editing ? (
    <form
      className="comment-edit-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await commit({ type: 'comment/edit', id: comment.id, text: text.trim() })) {
          setEditing(false);
          notify('Comment updated.');
        }
      }}
    >
      <textarea
        aria-label="Edit comment"
        required
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="button-row">
        <button className="text-button" disabled={pending}>
          Save
        </button>
        <button type="button" className="text-button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  ) : (
    <button
      className="text-button"
      onClick={() => {
        setText(comment.text);
        setEditing(true);
      }}
    >
      Edit
    </button>
  );
}
export function EditPodButton({ pod }: { pod: Pod }) {
  const { commit, notify, pending } = useApp();
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(pod);
  return (
    <>
      <button
        className="text-button"
        onClick={() => {
          setDraft(pod);
          setOpen(true);
        }}
      >
        <Pencil size={16} />
        Edit pod
      </button>
      {open && (
        <Modal title="Edit pod" onClose={() => !pending && setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await commit({ type: 'pod/edit', pod: draft })) {
                setOpen(false);
                notify('Pod updated.');
              }
            }}
          >
            <label>
              Name
              <input
                required
                maxLength={120}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Goal
              <textarea
                required
                maxLength={500}
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
              />
            </label>
            <label>
              Minutes
              <input
                type="number"
                required
                min={1}
                max={120}
                value={draft.minutes}
                onChange={(e) => setDraft({ ...draft, minutes: Number(e.target.value) })}
              />
            </label>
            <label>
              Session style
              <select
                value={draft.vibe}
                onChange={(e) => setDraft({ ...draft, vibe: e.target.value as Pod['vibe'] })}
              >
                {['Quiet focus', 'Practice', 'Explain an idea'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Visibility
              <select
                value={draft.visibility}
                onChange={(e) =>
                  setDraft({ ...draft, visibility: e.target.value as Pod['visibility'] })
                }
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <button className="button primary" disabled={pending}>
              Save changes
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
