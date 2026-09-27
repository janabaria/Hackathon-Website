import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus, Timer } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { EmptyState, Modal } from '../components/ui';
import { newId } from '../lib/utils';
import type { Pod } from '../domain/schema';

export function PodsSection({ initialGoal }: { initialGoal: string }) {
  const { data, commit, notify } = useApp();
  const [open, setOpen] = useState(Boolean(initialGoal));
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState(initialGoal.slice(0, 500));
  const [minutes, setMinutes] = useState(25);
  const [vibe, setVibe] = useState<Pod['vibe']>('Quiet focus');
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Make time for an idea.</h2>
          <p className="muted">
            Personal focus rooms with a working timer. Shared calls can be connected later.
          </p>
        </div>
        <button className="button secondary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          New pod
        </button>
      </div>
      {data.pods.length ? (
        <div className="card-grid">
          {data.pods.map((pod) => (
            <article className="card pod-card" key={pod.id}>
              <span className="eyebrow">{pod.vibe}</span>
              <h2>{pod.title}</h2>
              <p>{pod.goal}</p>
              <small>{pod.minutes} minute session · Personal workspace</small>
              <Link className="button primary" to={`/focus/${pod.id}`}>
                Start focus <ArrowUpRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Timer}
            title="A clear goal. A quiet moment."
            description="Create your first pod and give one thing your full attention."
            action={
              <button className="button primary" onClick={() => setOpen(true)}>
                Create a focus pod
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
                  pod: { id: newId(), title: title.trim(), goal: goal.trim(), minutes, vibe },
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
              Pod name
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Your focus goal
              <textarea
                required
                maxLength={500}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Minutes
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
                Session style
                <select value={vibe} onChange={(e) => setVibe(e.target.value as Pod['vibe'])}>
                  <option>Quiet focus</option>
                  <option>Practice</option>
                  <option>Explain an idea</option>
                </select>
              </label>
            </div>
            <button className="button primary full-width">Create pod</button>
          </form>
        </Modal>
      )}
    </>
  );
}
