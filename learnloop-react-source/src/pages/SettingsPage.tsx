import { useRef, useState } from 'react';
import { Download, Moon, Sun, Upload } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { createEmptyData, dataSchema, type AppData } from '../domain/schema';
import { downloadJson, STORAGE_KEY } from '../services/storage';
import { Modal, PageHeader } from '../components/ui';

export function SettingsPage() {
  const { data, commit, notify, recoveryError } = useApp();
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Workspace settings"
        description="Your preferences, your content, your next version."
      />
      <div className="settings-grid">
        <section className="card settings-card">
          <h2>Appearance</h2>
          <p className="muted">Choose the space you want to learn in.</p>
          <div className="theme-options">
            {(['light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                className={`button secondary ${data.settings.theme === theme ? 'selected' : ''}`}
                aria-pressed={data.settings.theme === theme}
                onClick={() =>
                  commit({ type: 'settings/update', settings: { ...data.settings, theme } })
                }
              >
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                {theme === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.settings.roomyText}
              onChange={(e) =>
                commit({
                  type: 'settings/update',
                  settings: { ...data.settings, roomyText: e.target.checked },
                })
              }
            />
            Roomier text spacing
          </label>
        </section>
        <section className="card settings-card">
          <h2>Your data</h2>
          <p className="muted">
            Content stays in this browser. Export a backup to move it to another device. Import
            replaces the current workspace.
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
              onClick={() => downloadJson(data, 'learnloop-data.json')}
            >
              <Download size={17} />
              Export data
            </button>
            <button className="button secondary" onClick={() => input.current?.click()}>
              <Upload size={17} />
              Import JSON
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
              onClick={() => {
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
              Export original recovery backup
            </button>
          )}
          <hr />
          <h3>Start with a clean workspace</h3>
          <p className="muted">Remove content and return to the empty starting point.</p>
          <button className="text-button danger-text" onClick={() => setResetOpen(true)}>
            Reset workspace
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
              onClick={() => downloadJson(data, 'learnloop-before-import.json')}
            >
              Back up current data
            </button>
            <button
              className="button primary"
              onClick={() => {
                if (commit({ type: 'data/replace', data: pendingImport })) {
                  setPendingImport(null);
                  notify('Workspace imported.');
                }
              }}
            >
              Replace and import
            </button>
          </div>
        </Modal>
      )}
      {resetOpen && (
        <Modal title="Reset this workspace?" onClose={() => setResetOpen(false)}>
          <p>
            This removes your posts, reels, quizzes, pods, profile, and progress from this browser.
            Export a backup first if you want to keep them.
          </p>
          <div className="button-row">
            <button className="button secondary" onClick={() => setResetOpen(false)}>
              Keep my data
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (commit({ type: 'data/replace', data: createEmptyData() })) {
                  setResetOpen(false);
                  notify('Workspace reset.');
                }
              }}
            >
              Reset everything
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
