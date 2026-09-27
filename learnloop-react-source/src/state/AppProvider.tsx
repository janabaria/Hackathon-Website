import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { reduceData, type Action } from '../domain/actions';
import { createEmptyData, dataSchema, type AppData } from '../domain/schema';
import { loadData, saveData } from '../services/storage';
import { supabase } from '../services/supabase';
import { readAccount, writeAccount } from '../services/account';

type AppContextValue = {
  data: AppData;
  commit: (action: Action) => Promise<boolean>;
  notice: string;
  notify: (message: string) => void;
  recoveryError: string | null;
  cloud: boolean;
  checking: boolean;
  userId: string | null;
  loading: boolean;
  pending: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() =>
    supabase ? { data: createEmptyData(), error: null } : loadData(),
  );
  const [data, setData] = useState(loaded.data);
  const [recoveryError, setRecoveryError] = useState<string | null>(loaded.error);
  const [notice, setNotice] = useState('');
  const [checking, setChecking] = useState(!!supabase);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const dataRef = useRef(data);
  const identity = useRef<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const notify = useCallback((message: string) => setNotice(message), []);
  const refresh = useCallback(async () => {
    const id = identity.current;
    if (!id || busy.current) return;
    const version = ++generation.current;
    setLoading(true);
    try {
      const next = await readAccount(id);
      if (version !== generation.current || identity.current !== id) return;
      dataRef.current = next;
      setData(next);
      setRecoveryError(null);
    } catch (err) {
      if (version === generation.current)
        setRecoveryError(
          'Could not load your account. Check the connection and run supabase/002_connected_app.sql if it has not been installed. ' +
            (err instanceof Error ? err.message : ((err as { message?: string })?.message ?? '')),
        );
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setChecking(false);
      if (identity.current === id) return;
      generation.current++;
      identity.current = id;
      setUserId(id);
      setLoading(!!id);
      const empty = createEmptyData();
      dataRef.current = empty;
      setData(empty);
      setRecoveryError(null);
      setNotice('');
    });
    return () => auth.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (userId) void refresh();
  }, [userId, refresh]);
  const commit = useCallback(
    async (action: Action) => {
      if (busy.current) {
        setNotice('Please wait for the current save.');
        return false;
      }
      if (recoveryError && action.type !== 'data/replace') {
        setNotice('Refresh your account before making changes.');
        return false;
      }
      const id = identity.current;
      if (supabase && !id) {
        setNotice('Sign in to save your changes.');
        return false;
      }
      busy.current = true;
      setPending(true);
      generation.current++;
      let saved = false;
      try {
        const next = dataSchema.parse(reduceData(dataRef.current, action));
        if (supabase && id) {
          await writeAccount(id, dataRef.current, action);
          saved = true;
          if (identity.current !== id) return false;
          dataRef.current = next;
          setData(next);
          // Refresh canonical counts and content after a successful write.
          try {
            const canonical = await readAccount(id);
            if (identity.current === id) {
              dataRef.current = canonical;
              setData(canonical);
            }
          } catch {
            setNotice('Saved to Supabase. Refresh to reload the latest feed.');
          }
        } else {
          saveData(next);
          dataRef.current = next;
          setData(next);
          saved = true;
        }
        setRecoveryError(null);
        return true;
      } catch (err) {
        setNotice(
          'Not saved: ' +
            (err instanceof Error
              ? err.message
              : ((err as { message?: string })?.message ?? 'Check your connection and retry.')),
        );
        return saved;
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [recoveryError],
  );
  const signOut = useCallback(async () => {
    if (busy.current) return;
    const result = await supabase?.auth.signOut();
    if (result?.error) setNotice(result.error.message);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    document.documentElement.classList.toggle('roomy', data.settings.roomyText);
  }, [data.settings]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return (
    <AppContext.Provider
      value={{
        data,
        commit,
        notice,
        notify,
        recoveryError,
        cloud: !!supabase,
        checking,
        userId,
        loading,
        pending,
        refresh,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
