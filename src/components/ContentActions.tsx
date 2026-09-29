import { ReelComments } from './ReelComments';
import { StudyActions } from './StudyActions';
import { T, useT } from '../lib/i18n';
import { useState } from 'react';

import { Bookmark, BookOpen, MessageCircle, Share2, Heart } from 'lucide-react';

import type { Post, Reel } from '../domain/schema';

import { useApp } from '../state/AppProvider';

import { newId } from '../lib/utils';

import { DeleteButton } from './DeleteButton';

import { Avatar, Modal } from './ui';

export function ContentActions({ content }: { content: Post | Reel }) {
  const t = useT();
  const isReel = 'title' in content;
  const { data, commit, notify } = useApp();

  const [studyOpen, setStudyOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);

  const [text, setText] = useState('');

  const comments = data.comments.filter((comment) => comment.contentId === content.id);

  const shareText = `${'title' in content ? content.title + '\n' : ''}${content.caption}\n#${content.topic}`;

  return (
    <>
      <div className="content-actions">
        {isReel && (
          <button
            aria-label="Like reel"
            aria-pressed={content.liked}
            onClick={() => void commit({ type: 'content/toggle', id: content.id, field: 'liked' })}
          >
            <Heart size={24} fill={content.liked ? 'currentColor' : 'none'} />
            <span>{content.likeCount ?? Number(content.liked)}</span>
          </button>
        )}
        <button
          aria-label={t('Study this')}

          aria-pressed={content.liked}

          onClick={() => {
            setStudyOpen(true);
            if (!isReel && !content.liked)
              void commit({ type: 'content/toggle', id: content.id, field: 'liked' });
          }}
        >
          <BookOpen size={19} />

          <span>
            <T>Study this</T>
            {!isReel && <> · {content.likeCount ?? Number(content.liked)}</>}
          </span>
        </button>

        <button
          aria-label={isReel ? 'Comments' : t('Discussions')}
          onClick={() => setCommentsOpen(true)}
        >
          <MessageCircle size={19} />

          <span>
            {isReel ? 'Comments' : <T>Discussions</T>} · {comments.length}
          </span>
        </button>

        <button aria-label={t('Share')} onClick={() => setShareOpen(true)}>
          <Share2 size={19} />

          <span>{content.shares}</span>
        </button>

        <button
          aria-label={t('Save')}

          aria-pressed={content.saved}

          onClick={async () =>
            await commit({ type: 'content/toggle', id: content.id, field: 'saved' })
          }
        >
          <Bookmark size={19} />
        </button>
      </div>

      {studyOpen && <StudyActions content={content} onClose={() => setStudyOpen(false)} />}
      {commentsOpen && isReel && (
        <ReelComments id={content.id} onClose={() => setCommentsOpen(false)} />
      )}
      {commentsOpen && !isReel && (
        <Modal title="Discussions" onClose={() => setCommentsOpen(false)}>
          <div className="comments-list">
            {comments.length ? (
              comments.map((comment) => (
                <div className="comment" key={comment.id}>
                  <Avatar id={comment.authorId} nameOnly />

                  <p>{comment.text}</p>
                  {comment.authorId === data.profile.id && (
                    <DeleteButton
                      label="discussion"
                      action={{ type: 'comment/delete', id: comment.id }}
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="muted">
                <T>Start a discussion with a thought or a question.</T>
              </p>
            )}
          </div>

          <form
            onSubmit={async (event) => {
              event.preventDefault();

              if (!text.trim()) return;

              if (
                await commit({
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
              <T>Your discussion</T>
              <input
                autoFocus

                required

                maxLength={500}

                value={text}

                onChange={(e) => setText(e.target.value)}
              />
            </label>

            <button className="button primary" disabled={!text.trim()}>
              <T>Post discussion</T>
            </button>
          </form>
        </Modal>
      )}

      {shareOpen && (
        <Modal title="Pass the learning on" onClose={() => setShareOpen(false)}>
          <p className="muted">
            <T>Copy the actual content to share. Share this learning with someone curious.</T>
          </p>

          <label>
            <T>Share text</T>
            <textarea readOnly value={shareText} />
          </label>

          <button
            className="button primary"

            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareText);

                await commit({ type: 'content/share', id: content.id });

                notify('Learning copied to clipboard.');

                setShareOpen(false);
              } catch {
                notify('Clipboard is unavailable. Select and copy the text above.');
              }
            }}
          >
            <T>Copy text</T>
          </button>
        </Modal>
      )}
    </>
  );
}
