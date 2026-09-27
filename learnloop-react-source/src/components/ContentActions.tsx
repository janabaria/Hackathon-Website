import { useState } from 'react';
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react';
import type { Post, Reel } from '../domain/schema';
import { useApp } from '../state/AppProvider';
import { newId } from '../lib/utils';
import { Avatar, Modal } from './ui';

export function ContentActions({ content }: { content: Post | Reel }) {
  const { data, commit, notify } = useApp();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [text, setText] = useState('');
  const comments = data.comments.filter((comment) => comment.contentId === content.id);
  const shareText = `${'title' in content ? content.title + '\n' : ''}${content.caption}\n#${content.topic}`;
  return (
    <>
      <div className="content-actions">
        <button
          aria-label="Like"
          aria-pressed={content.liked}
          onClick={() => commit({ type: 'content/toggle', id: content.id, field: 'liked' })}
        >
          <Heart size={19} />
          <span>{Number(content.liked)}</span>
        </button>
        <button aria-label="Comments" onClick={() => setCommentsOpen(true)}>
          <MessageCircle size={19} />
          <span>{comments.length}</span>
        </button>
        <button aria-label="Share" onClick={() => setShareOpen(true)}>
          <Share2 size={19} />
          <span>{content.shares}</span>
        </button>
        <button
          aria-label="Save"
          aria-pressed={content.saved}
          onClick={() => commit({ type: 'content/toggle', id: content.id, field: 'saved' })}
        >
          <Bookmark size={19} />
        </button>
      </div>
      {commentsOpen && (
        <Modal title="Conversation" onClose={() => setCommentsOpen(false)}>
          <div className="comments-list">
            {comments.length ? (
              comments.map((comment) => (
                <div className="comment" key={comment.id}>
                  <Avatar id={comment.authorId} nameOnly />
                  <p>{comment.text}</p>
                </div>
              ))
            ) : (
              <p className="muted">Start the conversation with a thought or a question.</p>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim()) return;
              if (
                commit({
                  type: 'comment/add',
                  comment: {
                    id: newId(),
                    contentId: content.id,
                    authorId: data.profile.id,
                    text: text.trim(),
                  },
                })
              )
                setText('');
            }}
          >
            <label>
              Your comment
              <input
                autoFocus
                required
                maxLength={500}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={!text.trim()}>
              Post comment
            </button>
          </form>
        </Modal>
      )}
      {shareOpen && (
        <Modal title="Pass the learning on" onClose={() => setShareOpen(false)}>
          <p className="muted">
            Copy the actual content to share. Posts in this workspace are stored on your device.
          </p>
          <label>
            Share text
            <textarea readOnly value={shareText} />
          </label>
          <button
            className="button primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareText);
                commit({ type: 'content/share', id: content.id });
                notify('Learning copied to clipboard.');
                setShareOpen(false);
              } catch {
                notify('Clipboard is unavailable. Select and copy the text above.');
              }
            }}
          >
            Copy text
          </button>
        </Modal>
      )}
    </>
  );
}
