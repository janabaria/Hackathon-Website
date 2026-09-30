import { useEffect, useState } from 'react';
import type { Pod } from '../domain/schema';
import { useApp } from '../state/AppProvider';
import { supabase } from '../services/supabase';
import { Avatar } from './ui';
export function PodRequests({ pod }: { pod: Pod }) {
  const { data, commit, pending } = useApp();
  const owner = (pod.authorId ?? data.profile.id) === data.profile.id;
  const [requests, setRequests] = useState<string[]>(() =>
    data.podRequests
      .filter((r) => r.podId === pod.id && r.status === 'pending')
      .map((r) => r.userId),
  );
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!owner) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      if (!supabase) {
        setRequests(
          data.podRequests
            .filter((r) => r.podId === pod.id && r.status === 'pending')
            .map((r) => r.userId),
        );
        return;
      }
      const result = await supabase
        .from('pod_requests')
        .select('user_id')
        .eq('pod_id', pod.id)
        .eq('status', 'pending');
      if (stopped) return;
      setLoading(false);
      if (result.error) setError('Requests could not be loaded. Retrying…');
      else {
        setRequests(result.data.map((r) => r.user_id));
        setError('');
      }
      timer = setTimeout(load, 4000);
    };
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [owner, pod.id, data.podRequests]);
  if (!owner) return null;
  return (
    <section className="pod-requests">
      <h3>
        Requests <span className="chip">{requests.length}</span>
      </h3>
      {error && <p role="alert">{error}</p>}
      {loading && !requests.length && <p role="status">Loading requests…</p>}
      {!loading && !error && !requests.length && (
        <p className="muted">No pending requests. New requests to join will appear here.</p>
      )}
      {requests.map((id) => (
        <div className="follow-person" key={id}>
          <div>
            <Avatar id={id} />
            <Avatar id={id} nameOnly />
          </div>
          <div className="button-row">
            {(['approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                className="button secondary"
                disabled={pending}
                onClick={async () => {
                  if (await commit({ type: 'pod/respond', podId: pod.id, userId: id, status }))
                    setRequests((r) => r.filter((x) => x !== id));
                }}
              >
                {status === 'approved' ? 'Accept' : 'Decline'}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
