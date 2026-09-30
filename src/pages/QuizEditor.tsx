import { T } from '../lib/i18n';
import { useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import { Modal } from '../components/ui';

import { useApp } from '../state/AppProvider';

import { newId } from '../lib/utils';

import { quizSchema, type Quiz } from '../domain/schema';

const blankQuestion = () => ({
  id: newId(),

  prompt: '',

  options: ['', '', '', ''],

  correctIndex: 0,

  explanation: '',
});

export function QuizEditor({
  onClose,
  initial,
  subject = '',
  editing = false,
}: {
  onClose: () => void;
  initial?: Quiz;
  editing?: boolean;
  subject?: string;
}) {
  const { data, commit, notify } = useApp();

  const [title, setTitle] = useState(initial?.title ?? '');

  const [topic, setTopic] = useState(initial?.topic ?? subject);

  const [difficulty, setDifficulty] = useState<Quiz['difficulty']>(
    initial?.difficulty ?? 'Beginner',
  );

  const [questions, setQuestions] = useState<Quiz['questions']>(
    initial?.questions ?? Array.from({ length: 4 }, blankQuestion),
  );

  const [error, setError] = useState('');

  const update = (index: number, changes: Partial<Quiz['questions'][number]>) =>
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...changes } : question)),
    );

  return (
    <Modal
      title={editing ? 'Edit quiz' : initial ? 'Review your AI draft' : 'Create a quiz'}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          if (questions.length < 4) {
            setError('Add at least four different questions before publishing.');
            return;
          }
          const result = quizSchema.safeParse({
            id: editing && initial ? initial.id : newId(),
            authorId: data.profile.id,
            title,
            topic,
            difficulty,
            questions,
            game: initial?.game,
          });

          if (!result.success) {
            setError(result.error.issues[0].message);

            return;
          }

          if (await commit({ type: editing ? 'quiz/edit' : 'quiz/add', quiz: result.data })) {
            notify(editing ? 'Quiz updated.' : 'Quiz published for the community.');

            onClose();
          }
        }}
      >
        <label>
          <T>Quiz title</T>
          <input
            required

            maxLength={120}

            value={title}

            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="form-grid">
          <label>
            <T>Topic</T>
            <input
              required

              maxLength={120}

              value={topic}

              onChange={(e) => setTopic(e.target.value)}
            />
          </label>

          <label>
            <T>Difficulty</T>
            <select
              value={difficulty}

              onChange={(e) => setDifficulty(e.target.value as Quiz['difficulty'])}
            >
              <option value="Beginner">
                <T>Beginner</T>
              </option>

              <option value="Intermediate">
                <T>Intermediate</T>
              </option>

              <option value="Advanced">
                <T>Advanced</T>
              </option>
            </select>
          </label>
        </div>

        <p className="muted">
          {questions.length} questions · Publish 4–20 distinct questions with four answers each.
        </p>
        {questions.map((q, index) => (
          <fieldset className="question-editor" key={q.id}>
            <legend>Question {index + 1}</legend>

            <label>
              <T>Question</T>
              <input
                required

                maxLength={500}

                value={q.prompt}

                onChange={(e) => update(index, { prompt: e.target.value })}
              />
            </label>

            {q.options.map((option, i) => (
              <label key={i}>
                Answer {String.fromCharCode(65 + i)}
                <input
                  required

                  maxLength={300}

                  value={option}

                  onChange={(e) =>
                    update(index, {
                      options: q.options.map((o, n) => (n === i ? e.target.value : o)),
                    })
                  }
                />
              </label>
            ))}

            <label>
              <T>Correct answer</T>
              <select
                value={q.correctIndex}

                onChange={(e) => update(index, { correctIndex: Number(e.target.value) })}
              >
                {q.options.map((_, i) => (
                  <option key={i} value={i}>
                    Answer {String.fromCharCode(65 + i)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <T>Explanation</T>
              <small>
                <T>Optional</T>
              </small>
              <textarea
                maxLength={1000}

                value={q.explanation}

                onChange={(e) => update(index, { explanation: e.target.value })}
              />
            </label>

            {questions.length > 1 && (
              <button
                className="text-button danger-text"

                type="button"

                onClick={() =>
                  setQuestions((current) => current.filter((item) => item.id !== q.id))
                }
              >
                <Trash2 size={15} />
                <T>Remove question</T>
              </button>
            )}
          </fieldset>
        ))}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="button-row">
          <button
            className="button secondary"

            type="button"

            disabled={questions.length >= 20}

            onClick={() => setQuestions((q) => [...q, blankQuestion()])}
          >
            <Plus size={16} />
            <T>Add question</T>
          </button>

          <button className="button primary">
            <T>Publish quiz</T>
          </button>
        </div>
      </form>
    </Modal>
  );
}
