import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react';
import type { Pod } from '../domain/schema';
import { useApp } from '../state/AppProvider';
import { usePodRoom } from '../hooks/usePodRoom';
import { usePodCall } from '../hooks/usePodCall';
function LiveVideo({
  stream,
  muted = false,
  name,
}: {
  stream: MediaStream;
  muted?: boolean;
  name: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => setBlocked(true));
    return () => {
      video.srcObject = null;
    };
  }, [stream]);
  return (
    <figure className="pod-video">
      <video ref={ref} autoPlay playsInline muted={muted} />
      <figcaption>{name}</figcaption>
      {blocked && (
        <button
          className="button primary"
          onClick={() =>
            void ref.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setBlocked(true))
          }
        >
          Play participant audio/video
        </button>
      )}
    </figure>
  );
}
export function SharedPod({ pod }: { pod: Pod }) {
  const { data, cloud } = useApp();
  const owner = (pod.authorId ?? data.profile.id) === data.profile.id;
  const {
    connectionId,
    members,
    room,
    answers: allAnswers,
    error,
    update,
    answer,
  } = usePodRoom(pod.id, data.profile.id, owner);
  const answers = allAnswers.filter((a) => a.run_id === room?.run_id);
  const call = usePodCall(pod.id, connectionId, members);
  const [quizId, setQuizId] = useState('');
  const [mode, setMode] = useState<'quiz' | 'blocks'>('quiz');
  const [working, setWorking] = useState(false);
  const quiz = data.quizzes.find((q) => q.id === room?.quiz_id);
  const question = quiz?.questions[room?.question_index ?? 0];
  const mine = answers.find(
    (a) => a.user_id === data.profile.id && a.question_index === room?.question_index,
  );
  const name = (id: string) =>
    [data.profile, ...data.accounts].find((p) => p.id === id)?.name || 'Learner';
  const act = async (fn: () => Promise<unknown>) => {
    setWorking(true);
    try {
      await fn();
    } finally {
      setWorking(false);
    }
  };
  if (!cloud) return <div className="card shared-pod">Sign in to join live study rooms.</div>;
  return (
    <section className="card shared-pod">
      <div className="section-heading">
        <h2>
          <Users size={22} /> Study together
        </h2>
        <span>
          {connectionId ? 'Connected' : 'Connecting…'} ·{' '}
          {new Set(members.map((m) => m.user_id)).size} online
        </span>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="pod-members">
        {[...new Set(members.map((m) => m.user_id))].map((id) => (
          <span className="chip" key={id}>
            {name(id)}
            {id === data.profile.id ? ' (you)' : ''}
          </span>
        ))}
      </div>
      <div className="button-row">
        {!call.stream ? (
          <>
            <button
              disabled={!connectionId || call.busy}
              className="button secondary"
              onClick={() => void call.join(false)}
            >
              <Mic size={17} />
              Join with microphone
            </button>
            <button
              disabled={!connectionId || call.busy}
              className="button secondary"
              onClick={() => void call.join(true)}
            >
              <Video size={17} />
              Join with camera
            </button>
          </>
        ) : (
          <>
            <button className="button secondary" aria-pressed={call.mic} onClick={call.toggleMic}>
              {call.mic ? <Mic /> : <MicOff />}
              {call.mic ? 'Mute mic' : 'Unmute mic'}
            </button>
            <button
              disabled={call.busy}
              className="button secondary"
              aria-pressed={call.camera}
              onClick={() => void call.toggleCamera()}
            >
              {call.camera ? <Video /> : <VideoOff />}
              {call.camera ? 'Camera off' : 'Camera on'}
            </button>
            <button className="button danger" onClick={call.leave}>
              <PhoneOff />
              Leave call
            </button>
          </>
        )}
      </div>
      {call.error && <p role="alert">{call.error}</p>}
      <div className="pod-video-grid">
        {call.stream && <LiveVideo stream={call.stream} muted name="You" />}
        {Object.entries(call.remote).map(([id, stream]) => (
          <LiveVideo
            key={id}
            stream={stream}
            name={name(members.find((m) => m.id === id)?.user_id ?? '')}
          />
        ))}
      </div>
      <div className="shared-quiz">
        <h2>Shared quiz & mini games</h2>
        {owner && (
          <div className="shared-quiz-setup">
            <label>
              Quiz
              <select value={quizId} onChange={(e) => setQuizId(e.target.value)}>
                <option value="">Choose a published quiz</option>
                {data.quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Game mode
              <select value={mode} onChange={(e) => setMode(e.target.value as 'quiz' | 'blocks')}>
                <option value="quiz">Team quiz</option>
                <option value="blocks">Answer blocks</option>
              </select>
            </label>
            <button
              disabled={!quizId || working || !room}
              className="button primary"
              onClick={() =>
                void act(() =>
                  update({
                    run_id: crypto.randomUUID(),
                    quiz_id: quizId,
                    mode,
                    question_index: 0,
                    phase: 'question',
                  }),
                )
              }
            >
              Start for everyone
            </button>
          </div>
        )}
        {!quiz || room?.phase === 'lobby' ? (
          <p className="muted">
            {owner
              ? 'Choose a quiz to start a shared round.'
              : 'Waiting for the pod creator to start a quiz.'}
          </p>
        ) : room?.phase === 'finished' ? (
          <h3>Round complete! Compare your scores below.</h3>
        ) : (
          question && (
            <>
              <span className="eyebrow">
                {quiz.title} · {room!.question_index + 1}/{quiz.questions.length}
              </span>
              <h3>{question.prompt}</h3>
              <div className={room?.mode === 'blocks' ? 'pod-answer-blocks' : 'answer-grid'}>
                {question.options.map((option, i) => (
                  <button
                    className={`answer ${mine?.choice === i ? 'selected' : ''} ${room?.phase === 'revealed' && question.correctIndex === i ? 'correct' : ''}`}
                    disabled={!!mine || room?.phase !== 'question' || working}
                    key={i}
                    onClick={() => void act(() => answer(i))}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {mine && <p>Your answer is locked in.</p>}
              {room?.phase === 'revealed' && (
                <p>
                  {question.explanation ||
                    `Correct answer: ${question.options[question.correctIndex]}`}
                </p>
              )}
              {owner && (
                <div className="button-row">
                  <button
                    className="button secondary"
                    disabled={working || room?.phase !== 'question'}
                    onClick={() => void act(() => update({ phase: 'revealed' }))}
                  >
                    Reveal answer
                  </button>
                  <button
                    className="button primary"
                    disabled={working || room?.phase !== 'revealed'}
                    onClick={() =>
                      void act(() =>
                        room!.question_index + 1 < quiz.questions.length
                          ? update({ question_index: room!.question_index + 1, phase: 'question' })
                          : update({ phase: 'finished' }),
                      )
                    }
                  >
                    {room!.question_index + 1 < quiz.questions.length
                      ? 'Next question'
                      : 'Finish round'}
                  </button>
                </div>
              )}
            </>
          )
        )}
        {quiz && (
          <div className="pod-scoreboard">
            <h3>Round scoreboard</h3>
            {[...new Set(answers.map((a) => a.user_id))].map((id) => (
              <p key={id}>
                {name(id)}{' '}
                <strong>
                  {
                    answers.filter(
                      (a) =>
                        a.user_id === id &&
                        quiz.questions[a.question_index]?.correctIndex === a.choice,
                    ).length
                  }
                </strong>{' '}
                correct · {answers.filter((a) => a.user_id === id).length} answered
              </p>
            ))}
          </div>
        )}
      </div>
      <small>
        The host controls the shared game. Microphone and camera stay off until you join a call.
      </small>
    </section>
  );
}
