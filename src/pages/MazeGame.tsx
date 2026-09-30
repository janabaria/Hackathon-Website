import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bot, Flag, Star } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Modal, EmptyState, PageHeader } from '../components/ui';
import { mazeSchema, type Maze } from '../domain/schema';
import { initialRobot, stepRobot, reachableMaze, starterMazes, type Command } from '../domain/maze';
import { newId } from '../lib/utils';
const labels = { forward: 'Forward', left: 'Turn left', right: 'Turn right' };
function Board({
  maze,
  robot,
  onCell,
  tool,
}: {
  maze: Maze;
  robot?: ReturnType<typeof initialRobot>;
  onCell?: (n: number) => void;
  tool?: string;
}) {
  return (
    <div className="maze-board" aria-label="Five by five maze">
      {Array.from({ length: 25 }, (_, n) => {
        const wall = maze.walls.includes(n),
          star = maze.stars.includes(n) && !robot?.collected.includes(n),
          here = robot?.cell === n;
        const contents = (
          <>
            {wall ? (
              ''
            ) : here ? (
              <>
                <Bot />
                <span className="robot-direction" aria-hidden="true">
                  {['↑', '→', '↓', '←'][robot.direction]}
                </span>
              </>
            ) : n === maze.start ? (
              'S'
            ) : n === maze.goal ? (
              <Flag />
            ) : star ? (
              <Star />
            ) : (
              ''
            )}
          </>
        );
        const desc = `Row ${Math.floor(n / 5) + 1}, column ${(n % 5) + 1}: ${here ? 'robot' : wall ? 'wall' : n === maze.start ? 'start' : n === maze.goal ? 'goal' : star ? 'star' : 'empty'}`;
        return onCell ? (
          <button
            type="button"
            key={n}
            className={`maze-cell ${wall ? 'wall' : ''}`}
            aria-label={`${desc}; place ${tool}`}
            onClick={() => onCell(n)}
          >
            {contents}
          </button>
        ) : (
          <div
            key={n}
            className={`maze-cell ${wall ? 'wall' : ''} ${here ? 'robot' : ''} ${star ? 'star' : ''}`}
            aria-label={desc}
          >
            {contents}
          </div>
        );
      })}
    </div>
  );
}
export function MazeEditor({ initial, onClose }: { initial?: Maze; onClose: () => void }) {
  const { data, commit, notify, pending } = useApp();
  const [maze, setMaze] = useState<Maze>(
    () =>
      initial ?? {
        ...starterMazes[0],
        id: newId(),
        authorId: data.profile.id,
        title: 'My robot maze',
      },
  );
  const [tool, setTool] = useState('wall'),
    [error, setError] = useState('');
  return (
    <Modal title={initial ? 'Edit maze' : 'Build a robot maze'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = mazeSchema.safeParse(maze);
          if (!parsed.success || !reachableMaze(maze)) {
            setError(
              'Keep start, goal and stars separate, with an open path to every star and the goal.',
            );
            return;
          }
          if (await commit({ type: 'maze/save', maze })) {
            notify('Maze published. Others can now play it.');
            onClose();
          }
        }}
      >
        <label>
          Game title
          <input
            value={maze.title}
            maxLength={120}
            required
            onChange={(e) => setMaze({ ...maze, title: e.target.value })}
          />
        </label>
        <p>
          Choose a tool, then tap squares. S is the start; the flag is the finish. The robot starts
          facing right. Your maze must have a reachable goal and stars.
        </p>
        <div className="button-row">
          {['wall', 'star', 'start', 'goal', 'erase'].map((t) => (
            <button
              type="button"
              className="button secondary"
              aria-pressed={tool === t}
              key={t}
              onClick={() => setTool(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <Board
          maze={maze}
          tool={tool}
          onCell={(n) => {
            if ((n === maze.start || n === maze.goal) && tool !== 'start' && tool !== 'goal')
              return;
            if ((tool === 'start' && n === maze.goal) || (tool === 'goal' && n === maze.start))
              return;
            setMaze((m) => ({
              ...m,
              walls: m.walls
                .filter((x) => x !== n)
                .concat(tool === 'wall' && !m.walls.includes(n) ? [n] : []),
              stars: m.stars
                .filter((x) => x !== n)
                .concat(tool === 'star' && !m.stars.includes(n) ? [n] : []),
              ...(tool === 'start' ? { start: n } : tool === 'goal' ? { goal: n } : {}),
            }));
            setError('');
          }}
        />
        <p className="muted">Up to 8 stars. Tap a wall or star again to remove it.</p>
        {error && <p role="alert">{error}</p>}
        <button className="button primary" disabled={pending}>
          Publish maze
        </button>
      </form>
    </Modal>
  );
}
export function MazeGamePage() {
  const { id } = useParams();
  const { data } = useApp();
  const m = [...starterMazes, ...data.mazes].find((m) => m.id === id);
  return m ? (
    <MazePlayer key={JSON.stringify(m)} maze={m} />
  ) : (
    <EmptyState
      icon={Bot}
      title="Game not found"
      description="Return to Interact to choose a game."
    />
  );
}
function MazePlayer({ maze }: { maze: Maze }) {
  const { data } = useApp();
  const [quizId, setQuizId] = useState(data.quizzes[0]?.id ?? '');
  const quiz = data.quizzes.find((q) => q.id === quizId);
  const [approved, setApproved] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);

  const [program, setProgram] = useState<Command[]>([]),
    [robot, setRobot] = useState(() => initialRobot(maze));
  const [running, setRunning] = useState(false),
    [cursor, setCursor] = useState(0),
    [runs, setRuns] = useState(0),
    [repeat, setRepeat] = useState(2);
  useEffect(() => {
    if (!running) return;
    if (cursor >= program.length || robot.status === 'crashed' || robot.status === 'won') {
      setRunning(false);
      return;
    }
    if (!approved || !quiz) return;
    const timer = setTimeout(() => {
      setRobot((r) => stepRobot(maze, r, program[cursor]));
      setCursor((c) => c + 1);
      setApproved(false);
      setAnswer(null);
    }, 700);
    return () => clearTimeout(timer);
  }, [running, cursor, program, robot.status, maze, approved, quiz]);
  const reset = () => {
    setRunning(false);
    setApproved(false);
    setAnswer(null);
    setCursor(0);
    setRobot(initialRobot(maze));
  };
  const add = (c: Command) => {
    reset();
    setProgram((p) => [...p, c].slice(0, 80));
  };
  return (
    <>
      <Link className="back-link" to="/interact">
        ← Back to Interact
      </Link>
      <PageHeader
        eyebrow="ROBOT LAB · ALGORITHMS & SPATIAL REASONING"
        title={maze.title}
        description="Choose a quiz, build your route, and earn every movement with a correct answer. Collect all stars and reach the flag. The robot starts facing right."
      />
      <section className="card maze-quiz-choice">
        <label>
          Practice quiz
          <select
            value={quizId}
            disabled={running}
            onChange={(e) => {
              reset();
              setQuizId(e.target.value);
            }}
          >
            <option value="">Choose a quiz</option>
            {data.quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} · {q.topic}
              </option>
            ))}
          </select>
        </label>
        {!data.quizzes.length && <p>Create a quiz in Interact before playing this maze.</p>}
        <p>
          Each correct answer unlocks exactly one command. Questions repeat in order if your route
          is longer than the quiz.
        </p>
      </section>
      <div className="maze-layout">
        <section className="card maze-stage">
          <Board maze={maze} robot={robot} />
          <p>
            Facing {['up', 'right', 'down', 'left'][robot.direction]} · Stars{' '}
            {robot.collected.length}/{maze.stars.length} · Runs {runs}
          </p>
          <p role="status">
            {robot.status === 'won'
              ? 'Maze solved! Your algorithm works.'
              : robot.status === 'crashed'
                ? 'Collision! Change your commands and try again.'
                : running
                  ? `Answer to unlock command ${cursor + 1} of ${program.length}`
                  : cursor
                    ? 'Program finished. Debug your route to collect all stars and reach the flag.'
                    : 'Ready. Add commands, then press Run.'}
          </p>
          {robot.status === 'won' && (
            <button
              className="button primary"
              onClick={() => {
                reset();
                setProgram([]);
              }}
            >
              Play again
            </button>
          )}
        </section>
        <section className="card maze-program">
          {running &&
            quiz &&
            cursor < program.length &&
            robot.status !== 'won' &&
            robot.status !== 'crashed' && (
              <section className="maze-question" aria-label="Movement question">
                <small>
                  Command {cursor + 1}: {labels[program[cursor]]} · Question{' '}
                  {(cursor % quiz.questions.length) + 1}/{quiz.questions.length}
                </small>
                <h2>{quiz.questions[cursor % quiz.questions.length].prompt}</h2>
                <div className="maze-answers">
                  {quiz.questions[cursor % quiz.questions.length].options.map((option, i) => (
                    <button
                      className="button secondary"
                      key={i}
                      disabled={approved}
                      aria-pressed={answer === i}
                      onClick={() => {
                        setAnswer(i);
                        setApproved(
                          i === quiz.questions[cursor % quiz.questions.length].correctIndex,
                        );
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p role="status">
                  {answer === null
                    ? 'Solve this question to move.'
                    : approved
                      ? 'Correct! Executing one command…'
                      : 'Not quite. The robot stays here. Try another answer.'}
                </p>
                {approved && <p>{quiz.questions[cursor % quiz.questions.length].explanation}</p>}
              </section>
            )}
          <h2>Your program</h2>
          <p>Commands run from left to right. Tap a command to remove it.</p>
          <div className="button-row">
            {(['forward', 'left', 'right'] as Command[]).map((c) => (
              <button
                className="button secondary"
                disabled={running || program.length >= 80}
                key={c}
                onClick={() => add(c)}
              >
                {labels[c]}
              </button>
            ))}
          </div>
          <div className="button-row">
            <label>
              Repeat count
              <select
                value={repeat}
                disabled={running}
                onChange={(e) => setRepeat(Number(e.target.value))}
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={running || !program.length || program.length + repeat > 80}
              onClick={() => {
                reset();
                setProgram((p) => [...p, ...Array<Command>(repeat).fill(p[p.length - 1])]);
              }}
            >
              Repeat last command
            </button>
          </div>
          <div className="command-track" aria-label="Program commands">
            {program.map((c, i) => (
              <button
                disabled={running}
                className={running && i === cursor ? 'active' : ''}
                key={i}
                aria-label={`Remove command ${i + 1}: ${labels[c]}`}
                onClick={() => {
                  reset();
                  setProgram((p) => p.filter((_, n) => n !== i));
                }}
              >
                {i + 1}. {labels[c]}
              </button>
            ))}
            {!program.length && <p>Your program is empty.</p>}
          </div>
          <div className="button-row">
            <button
              className="button primary"
              disabled={running || !program.length || !quiz}
              onClick={() => {
                setRobot(initialRobot(maze));
                setApproved(false);
                setAnswer(null);
                setCursor(0);
                setRuns((n) => n + 1);
                setRunning(true);
              }}
            >
              Run program
            </button>
            <button className="button secondary" onClick={reset}>
              {running ? 'Stop' : 'Reset robot'}
            </button>
            <button
              className="text-button"
              disabled={running}
              onClick={() => {
                reset();
                setProgram([]);
              }}
            >
              Clear commands
            </button>
          </div>
          <small>
            Maximum 80 commands. Your program stays here while you debug; published maze layouts are
            saved to your account.
          </small>
        </section>
      </div>
    </>
  );
}
