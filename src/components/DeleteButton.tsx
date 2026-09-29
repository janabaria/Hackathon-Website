import { T } from '../lib/i18n';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Action } from '../domain/actions';
import { useApp } from '../state/AppProvider';
import { Modal } from './ui';
export function DeleteButton({ action, label }: { action: Action; label: string }) {
  const { commit, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        className="text-button danger-text delete-content"
        aria-label={`Delete ${label}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={17} />
        <span>
          <T>Delete</T>
        </span>
      </button>
      {open && (
        <Modal title={`Delete ${label}?`} onClose={() => !busy && setOpen(false)}>
          <p>This permanently removes this {label}. This cannot be undone.</p>
          <div className="button-row">
            <button className="button secondary" disabled={busy} onClick={() => setOpen(false)}>
              <T>Keep it</T>
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                if (await commit(action)) {
                  setOpen(false);
                  notify(`${label} deleted.`);
                }
                setBusy(false);
              }}
            >
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
