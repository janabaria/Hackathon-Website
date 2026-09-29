import { T } from '../lib/i18n';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppProvider';
import { PageHeader, EmptyState } from '../components/ui';
import { Gamepad2 } from 'lucide-react';
import type { Quiz } from '../domain/schema';
function shuffled<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function LearningGamePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data } = useApp();
  const quiz = data.quizzes.find((q) => q.id === id);
  return quiz ? (
    <Game
      key={`${quiz.id}-${params.get('mode')}`}
      quiz={quiz}
      mode={params.get('mode') === 'cards' ? 'cards' : 'blocks'}
      themed={params.get('theme') === 'ai'}
    />
  ) : (
    <EmptyState icon={Gamepad2} title="Quiz not found" description="Choose a quiz from Interact." />
  );
}
function Game({ quiz, mode, themed }: { quiz: Quiz; mode: 'cards' | 'blocks'; themed: boolean }) {
  const { commit } = useApp();
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [order] = useState(() => shuffled(quiz.questions.map((_, i) => i)));
  const complete =
    mode === 'cards' ? round >= quiz.questions.length : matched.length === quiz.questions.length;
  return (
    <>
      <Link className="back-link" to="/interact">
        ← Back to games
      </Link>
      <PageHeader
        eyebrow={mode === 'blocks' ? 'MATCHING BLOCKS' : 'FLASHCARDS'}
        title={themed && quiz.game ? quiz.game.title : quiz.title}
        description={
          themed && quiz.game
            ? quiz.game.instructions
            : mode === 'blocks'
              ? 'Select a question, then match its answer. Clear every block.'
              : 'Try recalling the answer, then flip the card to check.'
        }
      />
      {complete ? (
        <section className="card score-screen">
          <h2>
            <T>That's another step forward!</T>
          </h2>
          <p>
            {mode === 'blocks'
              ? `${quiz.questions.length} matches in ${attempts} attempts.`
              : 'You reviewed every card.'}
          </p>
          {mode === 'blocks' && !saved && (
            <button
              className="button primary"
              onClick={async () => {
                if (
                  await commit({
                    type: 'quiz/complete',
                    id: quiz.id,
                    answers: quiz.questions.map((_, i) => answers[i]),
                  })
                )
                  setSaved(true);
              }}
            >
              <T>Save my first-try score</T>
            </button>
          )}
          {saved && (
            <p role="status">
              <T>Your score is saved.</T>
            </p>
          )}
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => {
                setRound(0);
                setMatched([]);
                setAttempts(0);
                setAnswers({});
                setSelected(null);
                setFlipped(false);
                setSaved(false);
                setMessage('');
              }}
            >
              <T>Play again</T>
            </button>
            <Link className="button primary" to={`/quiz/${quiz.id}`}>
              <T>Test my recall</T>
            </Link>
          </div>
        </section>
      ) : mode === 'cards' ? (
        <section className="card flashcard-player">
          <p>
            Card {round + 1} / {quiz.questions.length}
          </p>
          <button
            className={`flashcard ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(!flipped)}
            aria-label={flipped ? 'Show question' : 'Reveal answer'}
          >
            <span>{flipped ? 'ANSWER' : 'QUESTION'}</span>
            <h2>
              {flipped
                ? quiz.questions[round].options[quiz.questions[round].correctIndex]
                : quiz.questions[round].prompt}
            </h2>
            {flipped && <p>{quiz.questions[round].explanation}</p>}
            <small>
              <T>Tap to flip</T>
            </small>
          </button>
          <div className="button-row">
            <button
              className="button secondary"
              disabled={round === 0}
              onClick={() => {
                setRound((r) => r - 1);
                setFlipped(false);
              }}
            >
              <T>Previous</T>
            </button>
            <button
              className="button primary"
              onClick={() => {
                setRound((r) => r + 1);
                setFlipped(false);
              }}
            >
              {round === quiz.questions.length - 1 ? 'Finish review' : 'Next card'}
            </button>
          </div>
        </section>
      ) : (
        <section className="card block-game-panel">
          <p>
            {matched.length} / {quiz.questions.length} cleared · {attempts} attempts
          </p>
          <div className="block-game">
            <div>
              {quiz.questions.map((q, i) => (
                <button
                  className={`match-block ${selected === i ? 'selected' : ''} ${matched.includes(i) ? 'matched' : ''}`}
                  key={q.id}
                  disabled={matched.includes(i)}
                  aria-pressed={selected === i}
                  onClick={() => {
                    setSelected(i);
                    setMessage('Choose the matching answer.');
                  }}
                >
                  {matched.includes(i) ? '✓ ' : ''}
                  {q.prompt}
                </button>
              ))}
            </div>
            <div>
              {order.map((i) => (
                <button
                  className={`match-block answer-block ${matched.includes(i) ? 'matched' : ''}`}
                  disabled={matched.includes(i) || selected === null}
                  key={quiz.questions[i].id}
                  onClick={() => {
                    if (selected === null) return;
                    setAttempts((a) => a + 1);
                    const correct =
                      quiz.questions[selected].options[quiz.questions[selected].correctIndex] ===
                      quiz.questions[i].options[quiz.questions[i].correctIndex];
                    setAnswers((a) =>
                      selected in a
                        ? a
                        : {
                            ...a,
                            [selected]: correct
                              ? quiz.questions[selected].correctIndex
                              : (quiz.questions[selected].correctIndex + 1) % 4,
                          },
                    );
                    if (correct) {
                      setMatched((m) => [...m, selected]);
                      setSelected(null);
                      setMessage('Great connection! Keep going.');
                    } else setMessage('Not quite. Try another answer.');
                  }}
                >
                  {quiz.questions[i].options[quiz.questions[i].correctIndex]}
                </button>
              ))}
            </div>
          </div>
          <p role="status" className="feedback">
            {message || 'Pick a question to begin.'}
          </p>
        </section>
      )}
    </>
  );
}
