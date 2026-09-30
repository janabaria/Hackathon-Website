import { MazeEditor } from './MazeGame';
import { starterMazes } from '../domain/maze';
import type { Maze } from '../domain/schema';
import { DeleteButton } from '../components/DeleteButton';
import { T } from '../lib/i18n';
import type { Quiz } from '../domain/schema';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Gamepad2, PenLine, Sparkles } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { EmptyState, PageHeader, Topic } from '../components/ui';
import { QuizEditor } from './QuizEditor';
import { AiQuizCreator } from './AiQuizCreator';
export function InteractPage() {
  const { data } = useApp();
  const [params] = useSearchParams();
  const notebook = data.notebooks.find((n) => n.id === params.get('notebook'));
  const [mazeEditor, setMazeEditor] = useState<Maze | 'new' | null>(null);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [remix, setRemix] = useState<Quiz | null>(null);
  const [open, setOpen] = useState<'manual' | 'ai' | null>(null);
  const notes = notebook
    ? [
        notebook.title,
        ...notebook.sections.flatMap((s) => [
          s.title,
          s.notes,
          ...s.contentIds.map(
            (id) => [...data.posts, ...data.reels].find((p) => p.id === id)?.caption ?? '',
          ),
        ]),
      ].join('\n\n')
    : '';
  return (
    <>
      <PageHeader
        eyebrow="PRACTICE MAKES IT STICK"
        title="Learn it. Play it. Share it."
        description="Create a quiz for the community, then choose how to practice."
      />
      {notebook && (
        <div className="notice-card">
          <T>Working from</T>
          <strong>{notebook.title}</strong> · {notebook.subject}
        </div>
      )}
      <div className="creation-options">
        <button className="card creation-option" onClick={() => setOpen('manual')}>
          <PenLine size={28} />
          <h2>
            <T>Write my own quiz</T>
          </h2>
          <p>
            <T>Your questions, your explanations. Publish to help someone learn.</T>
          </p>
          <span>
            <T>Create manually →</T>
          </span>
        </button>
        <button
          className="card creation-option"
          onClick={() => {
            setRemix(null);
            setOpen('ai');
          }}
        >
          <Sparkles size={28} />
          <h2>
            <T>Create with AI</T>
          </h2>
          <p>
            <T>Turn your notes into a quiz or a themed learning game. Review before publishing.</T>
          </p>
          <span>
            <T>Start an AI draft →</T>
          </span>
        </button>
      </div>
      <section className="game-lab">
        <div className="section-heading">
          <div>
            <h2>Robot lab</h2>
            <p>
              Real puzzles, no multiple-choice questions. Build an algorithm, run it, and debug the
              route.
            </p>
          </div>
          <button className="button primary" onClick={() => setMazeEditor('new')}>
            Build a maze
          </button>
        </div>
        <div className="card-grid">
          {[...starterMazes, ...data.mazes].map((m) => (
            <article className="card quiz-card" key={m.id}>
              <Gamepad2 />
              <h3>{m.title}</h3>
              <p>
                {m.stars.length} {m.stars.length === 1 ? 'star' : 'stars'} · 5 × 5 maze · Algorithm
                puzzle
              </p>
              <Link className="button primary" to={`/maze/${m.id}`}>
                Play maze
              </Link>
              {m.authorId === data.profile.id && (
                <div className="button-row">
                  <button className="text-button" onClick={() => setMazeEditor(m)}>
                    Edit game
                  </button>
                  <DeleteButton label="game" action={{ type: 'maze/delete', id: m.id }} />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <h2>Community quizzes & practice</h2>
      <div className="card-grid">
        {data.quizzes.map((q) => (
          <article className="card quiz-card" key={q.id}>
            <div className="section-heading">
              <Gamepad2 />
              <Topic topic={q.topic} />
            </div>
            <h2>{q.title}</h2>
            {(q.authorId ?? data.profile.id) === data.profile.id && (
              <div className="button-row">
                <button className="text-button" onClick={() => setEditing(q)}>
                  Edit quiz
                </button>
                <DeleteButton label="quiz" action={{ type: 'quiz/delete', id: q.id }} />
              </div>
            )}
            <p className="muted">
              {q.difficulty} · {q.questions.length} questions
            </p>
            {data.quizResults[q.id] && (
              <small>
                Personal best: {data.quizResults[q.id].score}/{q.questions.length}
              </small>
            )}
            <p>
              <T>Choose your game mode</T>
            </p>
            <div className="game-mode-links">
              <Link className="button primary" to={`/quiz/${q.id}`}>
                <T>Classic quiz</T>
              </Link>
              <Link className="button secondary" to={`/game/${q.id}?mode=blocks`}>
                <T>Matching blocks</T>
              </Link>
              <Link className="button secondary" to={`/game/${q.id}?mode=cards`}>
                <T>Flashcards</T>
              </Link>
              <button
                className="text-button"
                onClick={() => {
                  setRemix(q);
                  setOpen('ai');
                }}
              >
                <T>Create an AI game from this quiz</T>
              </button>
              {q.game && (
                <Link className="button lime" to={`/game/${q.id}?mode=${q.game.mode}&theme=ai`}>
                  {q.game.title} →
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.quizzes.length && (
        <EmptyState
          icon={Gamepad2}
          title="Be the first to share a challenge."
          description="Create a quiz above. You can play it as a classic quiz, matching blocks, or flashcards."
        />
      )}
      {mazeEditor && (
        <MazeEditor
          initial={mazeEditor === 'new' ? undefined : mazeEditor}
          onClose={() => setMazeEditor(null)}
        />
      )}
      {editing && <QuizEditor initial={editing} editing onClose={() => setEditing(null)} />}
      {open === 'manual' && (
        <QuizEditor subject={notebook?.subject} onClose={() => setOpen(null)} />
      )}
      {open === 'ai' && (
        <AiQuizCreator
          initialKind={remix ? 'game' : 'quiz'}
          notes={
            remix
              ? remix.questions
                  .map((q) => `${q.prompt} Answer: ${q.options[q.correctIndex]}. ${q.explanation}`)
                  .join('\n')
              : notes
          }
          subject={remix?.topic ?? notebook?.subject}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
