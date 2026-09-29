import { T, useT } from '../lib/i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { newId } from '../lib/utils';
import type { Exam } from '../domain/schema';
import { Modal, PageHeader } from '../components/ui';
import { DeleteButton } from '../components/DeleteButton';
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function CalendarPage() {
  const t = useT();
  const { data, commit } = useApp();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [edit, setEdit] = useState<Exam | null>(null);
  const add = (date = dateKey(new Date())) =>
    setEdit({ id: newId(), title: '', subject: '', date, reminderDays: 7 });
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <>
      <PageHeader
        eyebrow="MAKE SPACE FOR WHAT MATTERS"
        title="Exam calendar"
        description="Plan ahead. A little learning every day adds up."
        action={
          <button className="button primary" onClick={() => add()}>
            <Plus size={18} />
            <T>Add exam</T>
          </button>
        }
      />
      <div className="card calendar-panel">
        <div className="section-heading">
          <button
            className="icon-button"
            aria-label={t('Previous month')}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronLeft />
          </button>
          <h2>
            {month.toLocaleDateString(data.settings.language, { month: 'long', year: 'numeric' })}
          </h2>
          <button
            className="icon-button"
            aria-label={t('Next month')}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <strong key={d}>
              <T>{d}</T>
            </strong>
          ))}
          {Array.from({ length: month.getDay() }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = dateKey(new Date(month.getFullYear(), month.getMonth(), i + 1));
            const exams = data.exams.filter((e) => e.date === date);
            return (
              <button
                className={`calendar-day ${date === dateKey(new Date()) ? 'today' : ''}`}
                key={date}
                aria-label={`${date}: ${exams.length} exams. Add exam`}
                onClick={() => add(date)}
              >
                <span>{i + 1}</span>
                {exams.map((e) => (
                  <small key={e.id}>{e.title}</small>
                ))}
              </button>
            );
          })}
        </div>
      </div>
      <div className="card-grid notebook-grid">
        {[...data.exams]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e) => (
            <article className="card exam-card" key={e.id}>
              <span className="eyebrow">{e.subject}</span>
              <h2>{e.title}</h2>
              <p>
                {new Date(e.date + 'T12:00:00').toLocaleDateString(data.settings.language)} ·{' '}
                <T>Remind me</T> {e.reminderDays} <T>{' days before'}</T>
              </p>
              <div className="button-row">
                <button className="button secondary" onClick={() => setEdit(e)}>
                  <T>Edit</T>
                </button>
                <Link className="text-link" to={`/search?q=${encodeURIComponent(e.subject)}`}>
                  <T>Study subject →</T>
                </Link>
                <DeleteButton label="exam" action={{ type: 'exam/delete', id: e.id }} />
              </div>
            </article>
          ))}
      </div>
      {!data.exams.length && (
        <p className="muted">
          <T>Choose a date or add your first exam.</T>
        </p>
      )}
      {edit && (
        <Modal title="Plan an exam" onClose={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await commit({ type: 'exam/save', exam: edit })) setEdit(null);
            }}
          >
            <label>
              <T>Exam name</T>
              <input
                required
                maxLength={120}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <label>
              <T>Subject</T>
              <input
                required
                maxLength={120}
                value={edit.subject}
                onChange={(e) => setEdit({ ...edit, subject: e.target.value })}
              />
            </label>
            <label>
              <T>Date</T>
              <input
                required
                type="date"
                value={edit.date}
                onChange={(e) => setEdit({ ...edit, date: e.target.value })}
              />
            </label>
            <label>
              <T>Remind me before</T>
              <select
                value={edit.reminderDays}
                onChange={(e) => setEdit({ ...edit, reminderDays: Number(e.target.value) })}
              >
                {[0, 1, 3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {d === 0 ? 'On exam day' : `${d} days`}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              <T>
                You'll see an encouraging reminder inside the app. No emails or push notifications.
              </T>
            </p>
            <button className="button primary">
              <T>Save exam</T>
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
