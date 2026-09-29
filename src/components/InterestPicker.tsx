import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { Modal } from './ui';
import { useT } from '../lib/i18n';
export const INTEREST_CATEGORIES = [
  'Mathematics',
  'Science',
  'Biology',
  'Chemistry',
  'Physics',
  'Programming',
  'Technology',
  'Languages',
  'History',
  'Geography',
  'Art & Design',
  'Music',
  'Business',
  'Psychology',
  'Health & Fitness',
  'Cooking',
  'Literature',
  'Engineering',
  'Sports',
  'Film & Media',
];
export function InterestPicker({
  value,
  onChange,
  required = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  return (
    <fieldset className="interest-picker">
      <legend>
        {t('Interests')} {required && <span aria-label="required">*</span>}
      </legend>
      <p className="muted">
        {t(
          required
            ? 'Choose the subjects you want to explore (at least one).'
            : 'Choose the subjects you want to explore.',
        )}
      </p>
      <div className="category-buttons">
        {[...new Set([...INTEREST_CATEGORIES, ...value])].map((category) => (
          <button
            key={INTEREST_CATEGORIES.includes(category) ? t(category) : category}
            type="button"
            className="chip"
            aria-pressed={value.includes(category)}
            onClick={() =>
              onChange(
                value.includes(category)
                  ? value.filter((v) => v !== category)
                  : value.length < 20
                    ? [...value, category]
                    : value,
              )
            }
          >
            {INTEREST_CATEGORIES.includes(category) ? t(category) : category}
          </button>
        ))}
        <button
          type="button"
          className="chip other-interest"
          disabled={value.length >= 20}
          onClick={() => {
            setCustom('');
            setError('');
            setOpen(true);
          }}
        >
          <Plus size={16} /> {t('Other interests')}
        </button>
      </div>
      {value.length >= 20 && <small>{t('Choose up to 20 interests.')}</small>}
      {open &&
        createPortal(
          <Modal title={t('Add an interest')} onClose={() => setOpen(false)}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const interest = custom.trim().replace(/\s+/g, ' ');
                if (!interest) {
                  setError(t('Enter an interest first.'));
                  return;
                }
                if (value.length >= 20) {
                  setError(t('Choose up to 20 interests.'));
                  return;
                }
                if (
                  value.some((item) => item.toLocaleLowerCase() === interest.toLocaleLowerCase())
                ) {
                  setError(t('This interest is already selected.'));
                  return;
                }
                const known = INTEREST_CATEGORIES.find(
                  (item) => item.toLowerCase() === interest.toLowerCase(),
                );
                onChange([...value, known ?? interest]);
                setOpen(false);
              }}
            >
              <label>
                {t('Your interest')}
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="button-row">
                <button type="submit" className="button primary">
                  {t('Add interest')}
                </button>
                <button type="button" className="button secondary" onClick={() => setOpen(false)}>
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </Modal>,
          document.body,
        )}
    </fieldset>
  );
}
