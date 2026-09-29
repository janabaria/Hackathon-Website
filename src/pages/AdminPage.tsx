import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useApp } from '../state/AppProvider';
import { Modal, PageHeader } from '../components/ui';

type Member = {
  id: string;
  email: string;
  name: string;
  admin: boolean;
  daily_ai_limit: number | null;
  restricted: boolean;
  used: number;
};
type Content = { id: string; author_id: string; kind: string; title: string; moderated: boolean };
type Audit = {
  id: number;
  actor_id: string;
  action: string;
  target: string;
  reason: string;
  created_at: string;
  details: unknown;
};
type Dashboard = {
  settings: { daily_ai_limit: number; ai_enabled: boolean };
  users: Member[];
  content: Content[];
  audit: Audit[];
};
type Change = {
  action_name: string;
  target_id?: string;
  value?: Record<string, unknown>;
  title: string;
};
const labelLimit = (n: number | null) =>
  n === null ? 'App default' : n === -1 ? 'Unlimited app allowance' : `${n} / day`;
export function AdminPage() {
  const { userId, notify } = useApp();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('users');
  const [limit, setLimit] = useState('10');
  const [enabled, setEnabled] = useState(true);
  const [edit, setEdit] = useState<Member | null>(null);
  const [memberLimit, setMemberLimit] = useState('');
  const [restricted, setRestricted] = useState(false);
  const [change, setChange] = useState<Change | null>(null);
  const [reason, setReason] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!supabase || !userId) {
      setError('Sign in with an administrator account.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc('admin_dashboard', { search_text: query });
    if (error) {
      setDashboard(null);
      setError(
        error.message.includes('Admin access')
          ? 'This account does not have admin access.'
          : error.message,
      );
    } else {
      setDashboard(data);
      setLimit(String(data.settings.daily_ai_limit));
      setEnabled(data.settings.ai_enabled);
    }
    setLoading(false);
  }, [query, userId]);
  useEffect(() => {
    void load();
  }, [load]);
  const propose = (c: Change) => {
    setReason('');
    setError('');
    setChange(c);
  };
  const apply = async () => {
    if (!change || !supabase || busy) return;
    setBusy(true);
    setError('');
    try {
      const { title: _, ...args } = change;
      const { error } = await supabase.rpc('admin_change', { ...args, reason_text: reason });
      if (error) throw error;
      setChange(null);
      setEdit(null);
      notify('Admin change saved and recorded.');
      await load();
    } catch (e) {
      setError((e as { message: string }).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="OWNER CONTROLS"
        title="Administration"
        description="Manage app allowances, contributions, and content. Every change is recorded."
        action={<ShieldCheck size={32} />}
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading admin controls…</p>}
      {dashboard && (
        <>
          <section className="card admin-panel">
            <h2>AI access</h2>
            <p className="muted">
              These limits belong to BTB. Google’s API quota still applies. Usage counts drafts and
              reviews, including failed provider requests, and resets at midnight UTC.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                propose({
                  action_name: 'settings',
                  value: { daily_ai_limit: Number(limit), ai_enabled: enabled },
                  title: 'Update AI settings for the app',
                });
              }}
            >
              <label>
                Default requests per user / day
                <input
                  required
                  type="number"
                  min="-1"
                  max="100000"
                  step="1"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </label>
              <small>
                Use 0 to disable requests, or -1 for unlimited app allowance. Individual overrides
                take priority.
              </small>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />{' '}
                Allow AI requests across the app
              </label>
              <button className="button primary" disabled={busy}>
                Save AI settings
              </button>
            </form>
          </section>
          <div className="button-row admin-tabs" role="group" aria-label="Admin sections">
            {['users', 'content', 'audit'].map((t) => (
              <button
                key={t}
                className={`button ${tab === t ? 'primary' : 'secondary'}`}
                onClick={() => setTab(t)}
              >
                {t === 'users'
                  ? 'Users & allowances'
                  : t === 'content'
                    ? 'Content moderation'
                    : 'Audit log'}
              </button>
            ))}
          </div>
          {tab !== 'audit' && (
            <form
              className="admin-search"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search);
              }}
            >
              <label>
                <Search size={18} />
                <input
                  aria-label="Search users or content"
                  maxLength={120}
                  placeholder="Search email, name, content, or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button className="button secondary">Search</button>
              <button
                type="button"
                className="button secondary"
                disabled={loading}
                onClick={() => void load()}
                aria-label="Refresh admin data"
              >
                <RefreshCw size={18} />
              </button>
            </form>
          )}
          {tab === 'users' && (
            <section className="admin-list">
              <p className="muted">
                Up to 100 matching users. Restrictions prevent new contributions and AI use; members
                can still read, export their private data, and delete their own content.
              </p>
              {dashboard.users.map((u) => (
                <article className="card admin-row" key={u.id}>
                  <div>
                    <h3>
                      {u.name || 'Unnamed member'}{' '}
                      {u.admin && <span className="topic">Administrator</span>}
                    </h3>
                    <p>{u.email}</p>
                    <small>
                      {u.used} requests today · {labelLimit(u.daily_ai_limit)} ·{' '}
                      {u.restricted ? 'Contributions restricted' : 'Active'}
                    </small>
                  </div>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      onClick={() => {
                        setEdit(u);
                        setMemberLimit(u.daily_ai_limit === null ? '' : String(u.daily_ai_limit));
                        setRestricted(u.restricted);
                      }}
                    >
                      Manage
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        propose({
                          action_name: 'reset_usage',
                          target_id: u.id,
                          title: `Reset today's BTB usage for ${u.email}`,
                        })
                      }
                    >
                      Reset usage
                    </button>
                  </div>
                </article>
              ))}
              {!dashboard.users.length && <p>No matching users.</p>}
            </section>
          )}
          {tab === 'content' && (
            <section className="admin-list">
              <p className="muted">
                Up to 100 matches. Hiding is reversible. Private notebook contents are not
                accessible here.
              </p>
              {dashboard.content.map((c) => (
                <article className="card admin-row" key={c.id}>
                  <div>
                    <span className="topic">
                      {c.kind} · {c.moderated ? 'Hidden' : 'Visible'}
                    </span>
                    <p>{c.title}</p>
                    <small>Author: {c.author_id}</small>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      propose({
                        action_name: 'moderate',
                        target_id: c.id,
                        value: { kind: c.kind, hidden: !c.moderated },
                        title: `${c.moderated ? 'Restore' : 'Hide'} this ${c.kind}: ${c.title.slice(0, 70)}`,
                      })
                    }
                  >
                    {c.moderated ? 'Restore' : 'Hide'}
                  </button>
                </article>
              ))}
              {!dashboard.content.length && <p>No matching content.</p>}
            </section>
          )}
          {tab === 'audit' && (
            <section className="admin-list">
              <p className="muted">Latest 50 changes, newest first.</p>
              {dashboard.audit.map((a) => (
                <article className="card admin-panel" key={a.id}>
                  <strong>
                    {a.action} · {new Date(a.created_at).toLocaleString()}
                  </strong>
                  <p>{a.reason}</p>
                  <small>
                    Actor: {a.actor_id} · Target: {a.target}
                  </small>
                  <details>
                    <summary>View recorded changes</summary>
                    <pre>{JSON.stringify(a.details, null, 2)}</pre>
                  </details>
                </article>
              ))}
              {!dashboard.audit.length && <p>No changes recorded yet.</p>}
            </section>
          )}
        </>
      )}
      {edit && !change && (
        <Modal title={`Manage ${edit.email}`} onClose={() => setEdit(null)}>
          <form
            className="admin-panel"
            onSubmit={(e) => {
              e.preventDefault();
              propose({
                action_name: 'user',
                target_id: edit.id,
                value: {
                  daily_ai_limit: memberLimit === '' ? null : Number(memberLimit),
                  restricted,
                },
                title: `Update access for ${edit.email}`,
              });
            }}
          >
            <label>
              Daily AI allowance
              <input
                type="number"
                min="-1"
                max="100000"
                step="1"
                placeholder="Use app default"
                value={memberLimit}
                onChange={(e) => setMemberLimit(e.target.value)}
              />
            </label>
            <small>Blank = app default. -1 = unlimited. 0 = no AI requests.</small>
            <label className="admin-check">
              <input
                type="checkbox"
                disabled={edit.admin}
                checked={restricted}
                onChange={(e) => setRestricted(e.target.checked)}
              />{' '}
              Restrict contributions and AI
            </label>
            {edit.admin && <small>Administrator accounts cannot be restricted here.</small>}
            <button className="button primary">Review changes</button>
          </form>
        </Modal>
      )}
      {change && (
        <Modal
          title="Confirm admin change"
          onClose={() => {
            if (!busy) setChange(null);
          }}
        >
          <form
            className="admin-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void apply();
            }}
          >
            <p>{change.title}</p>
            <pre>{JSON.stringify(change.value || { requests_today: 0 }, null, 2)}</pre>
            <label>
              Reason for this change
              <textarea
                required
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="button primary" disabled={busy}>
              {busy ? 'Saving…' : 'Confirm & save'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
