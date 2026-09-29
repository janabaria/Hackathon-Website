import { T } from '../lib/i18n';
import { useState } from 'react';
import { supabase } from '../services/supabase';
import { quizSchema, type Quiz } from '../domain/schema';
import { newId } from '../lib/utils';
import { Modal } from '../components/ui';
import { QuizEditor } from './QuizEditor';
export function AiQuizCreator({
  onClose,
  notes = '',
  subject = '',
  initialKind = 'quiz',
}: {
  onClose: () => void;
  notes?: string;
  subject?: string;
  initialKind?: 'quiz' | 'game';
}) {
  const [topic, setTopic] = useState(subject);
  const [source, setSource] = useState(notes.slice(0, 12000));
  const [kind, setKind] = useState(initialKind);
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Quiz | null>(null);
  if (draft) return <QuizEditor initial={draft} onClose={onClose} />;
  return (
    <Modal title="Create with AI" onClose={() => !busy && onClose()}>
      <p className="muted">
        <T>Turn your notes into practice. Review every answer before publishing.</T>
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            if (!supabase)
              throw new Error(
                'AI needs a connected account and server setup. Manual quizzes and game modes already work.',
              );
            const { data, error } = await supabase.functions.invoke('generate-learning', {
              body: { topic, notes: source, kind, idea },
              timeout: 105000,
            });
            if (error) {
              let message = 'AI request failed or timed out. Check your connection and try again.';
              try {
                const body = await error.context?.json();
                if (body?.error) message = body.error;
              } catch {}
              throw new Error(message);
            }
            if (data?.error) throw new Error(data.error);
            setDraft(
              quizSchema.parse({
                ...data,
                id: newId(),
                questions: data.questions.map((q: object) => ({ ...q, id: newId() })),
              }),
            );
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Could not generate a quiz. Please retry.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="plain-fieldset">
          <label>
            <T>What would you like?</T>
            <select value={kind} onChange={(e) => setKind(e.target.value as 'quiz' | 'game')}>
              <option value="quiz">
                <T>A practice quiz</T>
              </option>
              <option value="game">
                <T>A themed learning game</T>
              </option>
            </select>
          </label>
          <label>
            <T>Subject</T>
            <input
              required
              maxLength={120}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>
          <label>
            <T>Notes or source material</T>
            <textarea
              required
              rows={7}
              minLength={30}
              maxLength={12000}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Paste what you want to study. AI will use these notes."
            />
          </label>
          {kind === 'game' && (
            <label>
              <T>Game idea</T>
              <input
                required
                maxLength={500}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Space-themed matching blocks, or a flashcard adventure"
              />
              <small>
                <T>
                  AI creates a theme, instructions, questions, and a matching-block or flashcard
                  game.
                </T>
              </small>
            </label>
          )}
          <p className="muted">
            <T>
              Generating sends these notes to the configured AI provider. Nothing is published until
              you review and confirm.
            </T>
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary">
            {busy ? 'Creating your draft…' : 'Generate draft'}
          </button>
        </fieldset>
      </form>
    </Modal>
  );
}
