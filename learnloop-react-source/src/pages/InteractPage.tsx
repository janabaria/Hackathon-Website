import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Gamepad2, Plus } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { EmptyState, PageHeader, Topic } from '../components/ui';
import { QuizEditor } from './QuizEditor';

export function InteractPage() {
  const { data } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow="PRACTICE MAKES IT STICK"
        title="A little challenge goes a long way."
        description="Build quizzes around what you’re learning. Test yourself when you’re ready."
        action={
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Create quiz
          </button>
        }
      />
      {data.quizzes.length ? (
        <div className="card-grid">
          {data.quizzes.map((quiz) => (
            <article className="card quiz-card" key={quiz.id}>
              <div className="section-heading">
                <span className="tile-icon">
                  <Gamepad2 />
                </span>
                <Topic topic={quiz.topic} />
              </div>
              <h2>{quiz.title}</h2>
              <p className="muted">
                {quiz.difficulty} · {quiz.questions.length} questions
              </p>
              {data.quizResults[quiz.id] && (
                <small>
                  Personal best: {data.quizResults[quiz.id].score}/{quiz.questions.length}
                </small>
              )}
              <Link to={`/quiz/${quiz.id}`} className="button primary">
                Start quiz <ArrowUpRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Gamepad2}
            title="Your challenge collection is a blank page."
            description="Add your own questions and answers. Each quiz gives instant feedback and a final score."
            action={
              <button className="button primary" onClick={() => setOpen(true)}>
                Create your first quiz
              </button>
            }
          />
        </div>
      )}
      {open && <QuizEditor onClose={() => setOpen(false)} />}
    </>
  );
}
