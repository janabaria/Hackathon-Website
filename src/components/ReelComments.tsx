import { EditCommentButton } from '../components/EditContent';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Heart, MessageCircle, Send, Smile, X } from 'lucide-react';
import { Avatar, Modal } from './ui';
import { DeleteButton } from './DeleteButton';
import { useApp } from '../state/AppProvider';
import { newId } from '../lib/utils';
const emojiGroups = {
  Reactions: [
    ['👍', 'Thumbs up'],
    ['👏', 'Clapping'],
    ['🙌', 'Raised hands'],
    ['🔥', 'Fire'],
    ['❤️', 'Heart'],
    ['✨', 'Sparkles'],
    ['💯', 'Hundred points'],
    ['🎉', 'Celebration'],
  ],
  Faces: [
    ['😊', 'Smiling'],
    ['😂', 'Laughing'],
    ['😍', 'Heart eyes'],
    ['🤔', 'Thinking'],
    ['🤯', 'Mind blown'],
    ['😎', 'Cool'],
    ['🥹', 'Happy tears'],
    ['🙏', 'Thank you'],
  ],
  Learning: [
    ['💡', 'Idea'],
    ['📚', 'Books'],
    ['🧠', 'Brain'],
    ['🎯', 'Target'],
    ['✅', 'Check mark'],
    ['🚀', 'Rocket'],
    ['🌱', 'Growing'],
    ['📝', 'Notes'],
  ],
};
export function ReelComments({
  id,
  anchor,
  onClose,
}: {
  id: string;
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  const [bounds, setBounds] = useState<CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!anchor) {
      setBounds({});
      return;
    }
    const measure = () => {
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const bottom = Math.min(rect.bottom, viewportTop + (viewport?.height ?? window.innerHeight));
      const available = Math.max(0, bottom - Math.max(rect.top, viewportTop));
      const height = Math.min(available, Math.max(280, Math.min(rect.height * 0.72, 620)));
      setBounds({
        left: rect.left,
        top: bottom - height,
        width: rect.width,
        height,
        right: 'auto',
        bottom: 'auto',
        margin: 0,
        maxHeight: 'none',
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, [anchor]);
  const { data, commit, pending } = useApp();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiGroup, setEmojiGroup] = useState<keyof typeof emojiGroups>('Reactions');
  const inputRef = useRef<HTMLInputElement>(null);
  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? start;
    const next = text.slice(0, start) + emoji + text.slice(end);
    if (next.length > 500) return;
    setText(next);
    requestAnimationFrame(() => {
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };
  const comments = data.comments
    .filter((c) => c.contentId === id)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  return (
    <Modal
      title={`${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
      className={anchor ? 'reel-comment-sheet reel-framed-comments' : 'post-comment-dialog'}
      style={bounds}
      onClose={onClose}
    >
      <div className="reel-comments-scroll">
        {comments.length ? (
          comments.map((c) => (
            <article className="reel-comment" key={c.id}>
              <Avatar id={c.authorId} />
              <div>
                <Avatar id={c.authorId} nameOnly />
                {c.parentId && (
                  <small className="reply-context">
                    Reply to{' '}
                    {[data.profile, ...data.accounts].find(
                      (p) =>
                        p.id === data.comments.find((parent) => parent.id === c.parentId)?.authorId,
                    )?.name || 'an earlier comment'}
                  </small>
                )}
                <p>{c.text}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    setReplyTo(c.id);
                    inputRef.current?.focus();
                  }}
                >
                  Reply
                </button>
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
                  <div className="button-row">
                    <EditCommentButton comment={c} />
                    <DeleteButton label="comment" action={{ type: 'comment/delete', id: c.id }} />
                  </div>
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
          <div className="reel-comments-empty">
            <span>
              <MessageCircle size={28} />
            </span>
            <strong>Start the conversation</strong>
            <p>Ask a question or share what clicked for you.</p>
          </div>
        )}
      </div>
      {emojiOpen && (
        <section
          className="comment-emoji-picker"
          aria-label="Emoji picker"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setEmojiOpen(false);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        >
          <div className="emoji-picker-heading">
            <strong>Add a little expression</strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Close emoji picker"
              onClick={() => {
                setEmojiOpen(false);
                inputRef.current?.focus({ preventScroll: true });
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="emoji-categories" aria-label="Emoji categories">
            {(Object.keys(emojiGroups) as (keyof typeof emojiGroups)[]).map((group) => (
              <button
                type="button"
                key={group}
                aria-pressed={emojiGroup === group}
                onClick={() => setEmojiGroup(group)}
              >
                {group}
              </button>
            ))}
          </div>
          <div className="emoji-grid">
            {emojiGroups[emojiGroup].map(([emoji, label]) => (
              <button
                type="button"
                key={label}
                aria-label={label}
                title={label}
                disabled={
                  pending ||
                  text.length -
                    ((inputRef.current?.selectionEnd ?? 0) -
                      (inputRef.current?.selectionStart ?? 0)) +
                    emoji.length >
                    500
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>
      )}
      {replyTo && (
        <div className="reply-banner">
          Replying to{' '}
          {[data.profile, ...data.accounts].find(
            (p) => p.id === comments.find((c) => c.id === replyTo)?.authorId,
          )?.name || 'learner'}
          <button className="text-button" onClick={() => setReplyTo(null)}>
            Cancel reply
          </button>
        </div>
      )}
      <form
        onKeyDown={(e) => {
          if (e.key === 'Escape' && emojiOpen) {
            e.preventDefault();
            e.stopPropagation();
            setEmojiOpen(false);
          }
        }}
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
                parentId: replyTo ?? undefined,
                createdAt: new Date().toISOString(),
                liked: false,
                likeCount: 0,
              },
            })
          ) {
            setText('');
            setReplyTo(null);
            setEmojiOpen(false);
          }
        }}
      >
        <Avatar id={data.profile.id} />
        <button
          type="button"
          className="icon-button emoji-toggle"
          aria-label="Choose emoji"
          aria-expanded={emojiOpen}
          onClick={() => setEmojiOpen(!emojiOpen)}
        >
          <Smile size={21} />
        </button>
        <input
          ref={inputRef}
          aria-label="Add a comment"
          placeholder="Add a comment…"
          required
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="button primary" disabled={pending || !text.trim()}>
          <Send size={16} />
          <span>Post</span>
        </button>
      </form>
    </Modal>
  );
}
