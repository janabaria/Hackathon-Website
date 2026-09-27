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
export function QuizEditor({ onClose }: { onClose: () => void }) {
  const { commit, notify } = useApp();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Quiz['difficulty']>('Beginner');
  const [questions, setQuestions] = useState<Quiz['questions']>([blankQuestion()]);
  const [error, setError] = useState('');
  const update = (index: number, changes: Partial<Quiz['questions'][number]>) =>
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...changes } : question)),
    );
  return (
    <Modal title="Create a quiz" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const result = quizSchema.safeParse({ id: newId(), title, topic, difficulty, questions });
          if (!result.success) {
            setError(result.error.issues[0].message);
            return;
          }
          if (await commit({ type: 'quiz/add', quiz: result.data })) {
            notify('Quiz added to your collection.');
            onClose();
          }
        }}
      >
        <label>
          Quiz title
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Topic
            <input
              required
              maxLength={120}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Quiz['difficulty'])}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>
        </div>
        {questions.map((q, index) => (
          <fieldset className="question-editor" key={q.id}>
            <legend>Question {index + 1}</legend>
            <label>
              Question
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
              Correct answer
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
              Explanation <small>Optional</small>
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
                Remove question
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
            Add question
          </button>
          <button className="button primary">Save quiz</button>
        </div>
      </form>
    </Modal>
  );
}
