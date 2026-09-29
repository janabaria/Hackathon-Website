import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Avatar, Modal } from './ui';
import { DeleteButton } from './DeleteButton';
import { useApp } from '../state/AppProvider';
import { newId } from '../lib/utils';
export function ReelComments({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, commit, pending } = useApp();
  const [text, setText] = useState('');
  const comments = data.comments.filter((c) => c.contentId === id);
  return (
    <Modal title={`${comments.length} comments`} className="reel-comment-sheet" onClose={onClose}>
      <div className="reel-comments-scroll">
        {comments.length ? (
          comments.map((c) => (
            <article className="reel-comment" key={c.id}>
              <Avatar id={c.authorId} />
              <div>
                <Avatar id={c.authorId} nameOnly />
                <p>{c.text}</p>
                <time dateTime={c.createdAt}>
                  {c.createdAt
                    ? new Date(c.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Earlier comment'}
                </time>
                {c.authorId === data.profile.id && (
                  <DeleteButton label="comment" action={{ type: 'comment/delete', id: c.id }} />
                )}
              </div>
              <button
                className="comment-heart"
                disabled={pending}
                aria-label="Like comment"
                aria-pressed={!!c.liked}
                onClick={() => void commit({ type: 'comment/like', id: c.id })}
              >
                <Heart size={18} fill={c.liked ? 'currentColor' : 'none'} />
                <span>{c.likeCount ?? 0}</span>
              </button>
            </article>
          ))
        ) : (
          <p className="muted">No comments yet. Start the conversation.</p>
        )}
      </div>
      <form
        className="reel-comment-input"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || pending) return;
          if (
            await commit({
              type: 'comment/add',
              comment: {
                id: newId(),
                contentId: id,
                authorId: data.profile.id,
                text: text.trim(),
                createdAt: new Date().toISOString(),
                liked: false,
                likeCount: 0,
              },
            })
          )
            setText('');
        }}
      >
        <input
          aria-label="Add a comment"
          placeholder="Add a comment…"
          required
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="button primary" disabled={pending || !text.trim()}>
          Post
        </button>
      </form>
    </Modal>
  );
}
