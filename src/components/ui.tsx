import { createPortal } from 'react-dom';
import { useT } from '../lib/i18n';
import { useEffect, useRef, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { displayName, initials, topicColor } from '../lib/utils';
import { useApp } from '../state/AppProvider';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{t(eyebrow)}</p>}
        <h1>{t(title)}</h1>
        <p className="muted">{t(description)}</p>
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <section className="empty-state">
      <span className="empty-icon">
        <Icon size={28} strokeWidth={1.5} />
      </span>
      <h2>{t(title)}</h2>
      <p>{t(description)}</p>
      {action}
    </section>
  );
}
export function Topic({ topic }: { topic: string }) {
  return <span className={`topic topic-${topicColor(topic)}`}>{topic}</span>;
}
export function Avatar({ id, nameOnly = false }: { id: string; nameOnly?: boolean }) {
  const { data } = useApp();
  const person = [data.profile, ...data.accounts].find((p) => p.id === id);
  return (
    <Link
      to={`/profile/${id}`}
      className={nameOnly ? 'author-name' : 'avatar'}
      aria-label={`View ${displayName(person?.name)}`}
    >
      {nameOnly ? (
        displayName(person?.name)
      ) : person?.avatar ? (
        <img src={person.avatar} alt="" />
      ) : (
        initials(person?.name ?? '')
      )}
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  className?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const t = useT();
  return createPortal(
    <dialog
      ref={ref}
      className={className}
      aria-label={t(title)}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{t(title)}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label={t('Close dialog')}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>,
    document.body,
  );
}
