import { T } from '../lib/i18n';
import { useState } from 'react';
import { Award, BookOpen, Flame, MessageCircle, Video } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Modal } from './ui';
import { createEmptyData } from '../domain/schema';
import { supabase } from '../services/supabase';
export function BadgeCollection({ profileId }: { profileId: string }) {
  const { data } = useApp();
  const own = profileId === data.profile.id;
  const badges = [
    {
      name: 'Idea sharer',
      detail: 'Publish your first post',
      earned: data.posts.some((p) => p.authorId === profileId),
      icon: BookOpen,
    },
    {
      name: 'Minute mentor',
      detail: 'Publish your first reel',
      earned: data.reels.some((p) => p.authorId === profileId),
      icon: Video,
    },
    {
      name: 'Conversation starter',
      detail: 'Join a discussion',
      earned: data.comments.some((c) => c.authorId === profileId),
      icon: MessageCircle,
    },
    {
      name: 'Quiz maker',
      detail: 'Publish a practice quiz',
      earned: data.quizzes.some((q) => q.authorId === profileId),
      icon: Award,
    },
    ...(own
      ? [
          {
            name: 'Focused learner',
            detail: 'Complete a focus session',
            earned: data.completedSessions.length > 0,
            icon: Flame,
          },
          {
            name: 'Knowledge keeper',
            detail: 'Create your first notebook',
            earned: data.notebooks.length > 0,
            icon: BookOpen,
          },
          {
            name: 'Practice champion',
            detail: 'Earn a perfect quiz score',
            earned: Object.values(data.quizResults).some((r) => r.score === r.total),
            icon: Award,
          },
        ]
      : []),
  ];
  return (
    <section className="card badges-section">
      <h2>
        <T>Learning badges</T>
      </h2>
      <p className="muted">
        <T>Small steps deserve recognition.</T>
      </p>
      <div className="badge-grid">
        {badges.map(({ name, detail, earned, icon: Icon }) => (
          <div className={`learning-badge ${earned ? 'earned' : 'locked'}`} key={name}>
            <Icon size={26} />
            <strong>
              <T>{name}</T>
            </strong>
            <small>
              <T>{detail}</T>
            </small>
            <span>
              <T>{earned ? 'Earned' : 'Not yet earned'}</T>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
export function DeleteAccount() {
  const { cloud, commit, signOut, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="danger-zone">
      <h3>
        <T>Account</T>
      </h3>
      <button className="text-button danger-text" onClick={() => setOpen(true)}>
        <T>Delete account</T>
      </button>
      {open && (
        <Modal title="Permanently delete your account?" onClose={() => !busy && setOpen(false)}>
          <p>
            <T>
              Your profile, posts, reels, uploads, discussions, pods, notebooks, and progress will
              be permanently removed. This cannot be undone.
            </T>
          </p>
          <label>
            <T>Type DELETE to confirm</T>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="button secondary" disabled={busy} onClick={() => setOpen(false)}>
              <T>Keep my account</T>
            </button>
            <button
              className="button danger"
              disabled={busy || confirm !== 'DELETE'}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  if (cloud) {
                    const { error, data } = await supabase!.functions.invoke('delete-account', {
                      body: { confirmation: 'DELETE' },
                    });
                    if (error || !data?.deleted)
                      throw new Error(
                        'Account deletion could not complete. Check that the delete-account function is deployed, then retry.',
                      );
                    await signOut();
                  } else if (!(await commit({ type: 'data/replace', data: createEmptyData() })))
                    throw new Error('Could not clear local data.');
                  setOpen(false);
                  notify('Your account has been deleted.');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <T>{busy ? 'Deleting…' : 'Delete permanently'}</T>
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
