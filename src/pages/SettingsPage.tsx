import { Link } from 'react-router-dom';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { T } from '../lib/i18n';
import { AppearanceSettings } from '../components/AppearanceSettings';
import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { createEmptyData, dataSchema, type AppData } from '../domain/schema';
import { downloadJson, STORAGE_KEY } from '../services/storage';
import { Modal, PageHeader } from '../components/ui';

export function SettingsPage() {
  const admin = useAdminAccess();
  const { data, commit, notify, recoveryError, cloud } = useApp();
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  if (cloud)
    return (
      <>
        <PageHeader
          title="Account settings"
          description="Your settings, drafts, saved items, and progress sync privately to your account."
        />
        <AppearanceSettings />
        {admin && (
          <Link className="button primary" to="/admin">
            Administration · Users & AI limits
          </Link>
        )}
        <section className="card settings-card">
          <h2>
            <T>Export</T>
          </h2>
          <p>
            <T>
              Download the loaded workspace. Shared posts and quizzes are included. Import and reset
              are disabled for connected accounts.
            </T>
          </p>
          <button
            className="button secondary"
            onClick={async () => downloadJson(data, 'learnloop-account-export.json')}
          >
            <T>Export data</T>
          </button>
        </section>
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Workspace settings"
        description="Your preferences, your content, your next version."
      />
      <div className="settings-grid">
        <AppearanceSettings />
        <section className="card settings-card">
          <h2>
            <T>Your data</T>
          </h2>
          <p className="muted">
            <T>
              Content stays in this browser. Export a backup to move it to another device. Import
              replaces the current workspace.
            </T>
          </p>
          <div className="data-counts">
            <span>{data.posts.length} posts</span>
            <span>{data.reels.length} reels</span>
            <span>{data.quizzes.length} quizzes</span>
            <span>{data.accounts.length} accounts</span>
          </div>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={async () => downloadJson(data, 'learnloop-data.json')}
            >
              <Download size={17} />
              <T>Export data</T>
            </button>
            <button className="button secondary" onClick={async () => input.current?.click()}>
              <Upload size={17} />
              <T>Import JSON</T>
            </button>
          </div>
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            aria-label="Import workspace data"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError('');
              try {
                if (file.size > 4 * 1024 * 1024)
                  throw new Error('Choose a JSON file smaller than 4 MB.');
                const parsed = dataSchema.safeParse(JSON.parse(await file.text()));
                if (!parsed.success)
                  throw new Error(
                    parsed.error.issues
                      .map((issue) => `${issue.path.join('.') || 'Data'}: ${issue.message}`)
                      .slice(0, 3)
                      .join('\n'),
                  );
                setPendingImport(parsed.data);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                e.target.value = '';
              }
            }}
          />
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {recoveryError && (
            <button
              className="text-button"
              onClick={async () => {
                try {
                  downloadJson(
                    { raw: localStorage.getItem(STORAGE_KEY) },
                    'learnloop-recovery.json',
                  );
                } catch {
                  notify('Browser storage cannot be accessed.');
                }
              }}
            >
              <T>Export original recovery backup</T>
            </button>
          )}
          <hr />
          <h3>
            <T>Start with a clean workspace</T>
          </h3>
          <p className="muted">
            <T>Remove content and return to the empty starting point.</T>
          </p>
          <button className="text-button danger-text" onClick={async () => setResetOpen(true)}>
            <T>Reset workspace</T>
          </button>
        </section>
      </div>
      {pendingImport && (
        <Modal title="Replace workspace data?" onClose={() => setPendingImport(null)}>
          <p>
            This file contains {pendingImport.posts.length} posts, {pendingImport.reels.length}{' '}
            reels, {pendingImport.quizzes.length} quizzes, and {pendingImport.accounts.length}{' '}
            accounts. It will replace your current content.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={async () => downloadJson(data, 'learnloop-before-import.json')}
            >
              <T>Back up current data</T>
            </button>
            <button
              className="button primary"
              onClick={async () => {
                if (await commit({ type: 'data/replace', data: pendingImport })) {
                  setPendingImport(null);
                  notify('Workspace imported.');
                }
              }}
            >
              <T>Replace and import</T>
            </button>
          </div>
        </Modal>
      )}
      {resetOpen && (
        <Modal title="Reset this workspace?" onClose={() => setResetOpen(false)}>
          <p>
            <T>
              This removes your posts, reels, quizzes, pods, profile, and progress from this
              browser. Export a backup first if you want to keep them.
            </T>
          </p>
          <div className="button-row">
            <button className="button secondary" onClick={async () => setResetOpen(false)}>
              <T>Keep my data</T>
            </button>
            <button
              className="button danger"
              onClick={async () => {
                if (await commit({ type: 'data/replace', data: createEmptyData() })) {
                  setResetOpen(false);
                  notify('Workspace reset.');
                }
              }}
            >
              <T>Reset everything</T>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
