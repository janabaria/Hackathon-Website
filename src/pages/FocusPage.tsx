import { SharedPod } from '../components/SharedPod';
import { T } from '../lib/i18n';
import { useEffect, useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { Pause, Play, RotateCcw, Timer } from 'lucide-react';

import { useApp } from '../state/AppProvider';

import { useFocusTimer } from '../hooks/useFocusTimer';

import { formatTime, newId } from '../lib/utils';

import { EmptyState } from '../components/ui';

import type { Pod } from '../domain/schema';

export function FocusPage() {
  const { id } = useParams();

  const { data } = useApp();

  const pod = data.pods.find((p) => p.id === id);

  const allowed =
    pod &&
    ((pod.authorId ?? data.profile.id) === data.profile.id ||
      data.podRequests.some(
        (r) => r.podId === pod.id && r.userId === data.profile.id && r.status === 'approved',
      ));

  return pod && allowed ? (
    <FocusRoom key={pod.id} pod={pod} />
  ) : (
    <EmptyState
      icon={Timer}

      title="Join this pod first"

      description="Request to join from the pods page. The creator will review your request."

      action={
        <Link className="button primary" to="/?tab=pods">
          <T>Back to pods</T>
        </Link>
      }
    />
  );
}

function FocusRoom({ pod }: { pod: Pod }) {
  const { commit, notify } = useApp();

  const [sessionId, setSessionId] = useState(newId);

  const [recorded, setRecorded] = useState(false);

  const timer = useFocusTimer(pod.minutes * 60);

  useEffect(() => {
    if (timer.complete && !recorded) {
      void commit({ type: 'session/complete', id: sessionId }).then((saved) => {
        if (saved) {
          setRecorded(true);

          notify('Focus session completed and saved.');
        }
      });
    }
  }, [timer.complete, recorded, commit, sessionId, notify]);

  return (
    <div className="pod-session-layout">
      <div className="pod-session-main">
        <SharedPod pod={pod} />
      </div>
      <section className="focus-room">
        <div className="focus-room-content">
          <span className="eyebrow">{pod.vibe}</span>

          <h1>{pod.title}</h1>

          <p>{pod.goal}</p>

          <div className="timer-display">
            <span>
              {timer.complete
                ? 'SESSION COMPLETE'
                : timer.running
                  ? 'DEEP FOCUS'
                  : 'READY WHEN YOU ARE'}
            </span>

            <strong aria-live="off">{formatTime(timer.remaining)}</strong>
          </div>

          <progress
            max={pod.minutes * 60}

            value={pod.minutes * 60 - timer.remaining}

            aria-label="Session progress"
          />

          <div className="button-row">
            {!timer.complete && (
              <button className="button lime" onClick={timer.toggle}>
                {timer.running ? <Pause size={18} /> : <Play size={18} />}

                {timer.running ? 'Pause' : 'Start focus'}
              </button>
            )}

            <button
              className="button ghost"

              onClick={() => {
                timer.reset();

                setSessionId(newId());

                setRecorded(false);
              }}
            >
              <RotateCcw size={18} />
              <T>Reset</T>
            </button>
          </div>

          {timer.complete && (
            <Link to="/studio" className="button lime">
              <T>Explain what you learned →</T>
            </Link>
          )}

          <small>
            <T>Personal focus session · Leaving this page ends the timer.</T>
          </small>
        </div>
      </section>
    </div>
  );
}
