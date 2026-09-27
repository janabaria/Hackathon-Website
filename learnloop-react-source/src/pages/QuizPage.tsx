import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Gamepad2, X } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { EmptyState, Topic } from '../components/ui';
import type { Quiz } from '../domain/schema';

export function QuizPage() {
  const { id } = useParams();
  const { data } = useApp();
  const quiz = data.quizzes.find((q) => q.id === id);
  return quiz ? (
    <QuizRunner key={quiz.id} quiz={quiz} />
  ) : (
    <EmptyState
      icon={Gamepad2}
      title="Quiz not found"
      description="Add a quiz to your workspace first."
      action={
        <Link className="button primary" to="/interact">
          Back to quizzes
        </Link>
      }
    />
  );
}
function QuizRunner({ quiz }: { quiz: Quiz }) {
  const { commit } = useApp();
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const question = quiz.questions[answers.length];
  const score = answers.filter((a, i) => quiz.questions[i].correctIndex === a).length;
  if (!question)
    return (
      <section className="card quiz-runner score-screen">
        <span className="eyebrow">ONE MORE STEP FORWARD</span>
        <h1>Keep that curiosity going.</h1>
        <div className="score">
          {score}
          <span> / {quiz.questions.length}</span>
        </div>
        <p className="muted">
          {score === quiz.questions.length
            ? 'You got every answer right.'
            : 'Every question is a chance to learn.'}
        </p>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() => {
              setAnswers([]);
              setSelected(null);
            }}
          >
            Try again
          </button>
          <Link className="button secondary" to="/interact">
            Back to quizzes
          </Link>
          <Link className="text-link" to="/studio">
            Explain what you learned →
          </Link>
        </div>
      </section>
    );
  return (
    <>
      <Link className="back-link" to="/interact">
        <ArrowLeft size={16} />
        Back to quizzes
      </Link>
      <section className="card quiz-runner">
        <Topic topic={quiz.topic} />
        <div className="section-heading">
          <h3>{quiz.title}</h3>
          <small>
            {answers.length + 1} of {quiz.questions.length}
          </small>
        </div>
        <progress value={answers.length} max={quiz.questions.length} aria-label="Quiz progress" />
        <h2>{question.prompt}</h2>
        <div className="answers">
          {question.options.map((option, index) => (
            <button
              key={index}
              disabled={selected !== null}
              className={`answer ${selected !== null ? (index === question.correctIndex ? 'correct' : index === selected ? 'incorrect' : '') : ''}`}
              onClick={() => setSelected(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              {option}
              {selected !== null && index === question.correctIndex && <Check size={18} />}
              {selected === index && index !== question.correctIndex && <X size={18} />}
            </button>
          ))}
        </div>
        {selected !== null && (
          <>
            <div className="feedback" role="status">
              <strong>
                {selected === question.correctIndex
                  ? 'That’s right.'
                  : 'Not quite. Here’s the answer.'}
              </strong>
              <p>{question.explanation || question.options[question.correctIndex]}</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                const next = [...answers, selected];
                if (
                  next.length === quiz.questions.length &&
                  !commit({ type: 'quiz/complete', id: quiz.id, answers: next })
                )
                  return;
                setAnswers(next);
                setSelected(null);
              }}
            >
              {answers.length + 1 === quiz.questions.length ? 'See my score' : 'Next question'} →
            </button>
          </>
        )}
      </section>
    </>
  );
}
