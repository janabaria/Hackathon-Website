import { EditPodButton } from '../components/EditContent';
import { T } from '../lib/i18n';
import { Avatar } from '../components/ui';

import { DeleteButton } from '../components/DeleteButton';

import { useEffect, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { ArrowUpRight, Plus, Timer } from 'lucide-react';

import { useApp } from '../state/AppProvider';

import { EmptyState, Modal } from '../components/ui';

import { newId } from '../lib/utils';

import type { Pod } from '../domain/schema';

export function PodsSection({ initialGoal }: { initialGoal: string }) {
  const { data, commit, notify } = useApp();
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('create') === '1') {
      setOpen(true);
      const next = new URLSearchParams(params);
      next.delete('create');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const [open, setOpen] = useState(Boolean(initialGoal));

  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const [title, setTitle] = useState('');

  const [goal, setGoal] = useState(initialGoal.slice(0, 500));

  const [minutes, setMinutes] = useState(25);

  const [vibe, setVibe] = useState<Pod['vibe']>('Quiet focus');

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>
            <T>Make time for an idea.</T>
          </h2>

          <p className="muted">
            <T>
              Discover a public pod or request access to a private one. Creators approve new
              members.
            </T>
          </p>
        </div>

        <button className="button secondary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          <T>New pod</T>
        </button>
      </div>

      {data.pods.length ? (
        <div className="card-grid">
          {data.pods.map((pod) => {
            const own = (pod.authorId ?? data.profile.id) === data.profile.id;
            const request = data.podRequests.find(
              (r) => r.podId === pod.id && r.userId === data.profile.id,
            );
            const joined = own || request?.status === 'approved';
            return (
              <article className="card pod-card" key={pod.id}>
                <span className="eyebrow">{pod.vibe}</span>

                <h2>{pod.title}</h2>

                <p>{pod.goal}</p>

                <small>
                  {pod.minutes} minute session ·{' '}
                  {pod.visibility === 'public' ? 'Public pod' : 'Private pod'}
                </small>

                {joined ? (
                  <Link className="button primary" to={`/focus/${pod.id}`}>
                    <T>Start focus</T>
                    <ArrowUpRight size={17} />
                  </Link>
                ) : (
                  <button
                    className="button primary"
                    disabled={!!request}
                    onClick={() => void commit({ type: 'pod/request', podId: pod.id })}
                  >
                    <T>
                      {request?.status === 'pending'
                        ? 'Request pending'
                        : request?.status === 'rejected'
                          ? 'Request declined'
                          : 'Request to join'}
                    </T>
                  </button>
                )}

                {own && (
                  <>
                    <EditPodButton pod={pod} />
                    <DeleteButton label="pod" action={{ type: 'pod/delete', id: pod.id }} />
                    {data.podRequests
                      .filter((r) => r.podId === pod.id && r.status === 'pending')
                      .map((r) => (
                        <div className="pod-request" key={r.userId}>
                          <Avatar id={r.userId} nameOnly />
                          <div className="button-row">
                            <button
                              className="button secondary"
                              onClick={() =>
                                void commit({
                                  type: 'pod/respond',
                                  podId: pod.id,
                                  userId: r.userId,
                                  status: 'approved',
                                })
                              }
                            >
                              <T>Approve</T>
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                void commit({
                                  type: 'pod/respond',
                                  podId: pod.id,
                                  userId: r.userId,
                                  status: 'rejected',
                                })
                              }
                            >
                              <T>Decline</T>
                            </button>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Timer}

            title="A clear goal. A quiet moment."

            description="Create your first pod and give one thing your full attention."

            action={
              <button className="button primary" onClick={() => setOpen(true)}>
                <T>Create a focus pod</T>
              </button>
            }
          />
        </div>
      )}

      {open && (
        <Modal title="Create a focus pod" onClose={() => setOpen(false)}>
          <form
            onSubmit={async (event) => {
              event.preventDefault();

              if (!title.trim() || !goal.trim()) return;

              if (
                await commit({
                  type: 'pod/add',

                  pod: {
                    id: newId(),
                    authorId: data.profile.id,
                    visibility,
                    title: title.trim(),
                    goal: goal.trim(),
                    minutes,
                    vibe,
                  },
                })
              ) {
                setOpen(false);

                setTitle('');

                setGoal('');

                notify('Your pod is ready.');
              }
            }}
          >
            <label>
              <T>Visibility</T>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              >
                <option value="public">
                  <T>Public — visible goal, request to join</T>
                </option>
                <option value="private">
                  <T>Private — goal visible to members only</T>
                </option>
              </select>
            </label>

            <label>
              <T>Pod name</T>
              <input
                required

                maxLength={120}

                value={title}

                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label>
              <T>Your focus goal</T>
              <textarea
                required

                maxLength={500}

                value={goal}

                onChange={(e) => setGoal(e.target.value)}
              />
            </label>

            <div className="form-grid">
              <label>
                <T>Minutes</T>
                <input
                  type="number"

                  required

                  min={1}

                  max={120}

                  value={minutes}

                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </label>

              <label>
                <T>Session style</T>
                <select value={vibe} onChange={(e) => setVibe(e.target.value as Pod['vibe'])}>
                  <option value="Quiet focus">
                    <T>Quiet focus</T>
                  </option>

                  <option value="Practice">
                    <T>Practice</T>
                  </option>

                  <option value="Explain an idea">
                    <T>Explain an idea</T>
                  </option>
                </select>
              </label>
            </div>

            <button className="button primary full-width">
              <T>Create pod</T>
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
