import { T, useT } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { learningReminders } from '../domain/reminders';
import { Modal } from './ui';
export function ReminderBell() {
  const t = useT();
  const { data, commit } = useApp();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = window.setInterval(tick, 60000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', tick);
    };
  }, []);
  const reminders = learningReminders(data, now);
  return (
    <>
      <button
        className="icon-button reminder-bell"
        aria-label={`${t('Learning reminders')} (${reminders.length})`}
        onClick={() => setOpen(true)}
      >
        <Bell size={21} />
        {reminders.length > 0 && <span>{reminders.length}</span>}
      </button>
      {open && (
        <Modal title="A little nudge to grow" onClose={() => setOpen(false)}>
          <p className="muted">
            <T>
              Notebook check-ins after 4 days, plus your upcoming exam reminders. Reminders appear
              here when you open the app.
            </T>
          </p>
          {!reminders.length ? (
            <p>
              <T>You're all caught up. Keep your curiosity going!</T>
            </p>
          ) : (
            reminders.map((r) => (
              <article className="reminder-card" key={r.id}>
                <button
                  className="icon-button"
                  aria-label={`Dismiss ${r.title}`}
                  onClick={() => void commit({ type: 'reminder/dismiss', id: r.id })}
                >
                  <X size={16} />
                </button>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
                <Link className="button primary" to={r.to} onClick={() => setOpen(false)}>
                  <T>{r.action}</T>
                </Link>
              </article>
            ))
          )}
        </Modal>
      )}
    </>
  );
}
