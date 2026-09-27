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
import { dataSchema, type AppData } from '../domain/schema';
import { loadData, saveData } from '../services/storage';

type AppContextValue = {
  data: AppData;
  commit: (action: Action) => boolean;
  notice: string;
  notify: (message: string) => void;
  recoveryError: string | null;
};
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(loadData);
  const [data, setData] = useState(loaded.data);
  const [recoveryError, setRecoveryError] = useState(loaded.error);
  const [notice, setNotice] = useState('');
  const dataRef = useRef(data);
  const notify = useCallback((message: string) => setNotice(message), []);

  const commit = useCallback(
    (action: Action) => {
      if (recoveryError && action.type !== 'data/replace') {
        setNotice('Resolve the saved-data error in Settings before making changes.');
        return false;
      }
      try {
        const next = dataSchema.parse(reduceData(dataRef.current, action));
        saveData(next);
        dataRef.current = next;
        setData(next);
        setRecoveryError(null);
        return true;
      } catch (error) {
        setNotice(
          error instanceof Error && error.name === 'ZodError'
            ? 'That data is incomplete or invalid. Check the fields and try again.'
            : 'Could not save. Browser storage may be full or blocked. Export a backup in Settings and try a smaller image.',
        );
        return false;
      }
    },
    [recoveryError],
  );

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
    <AppContext.Provider value={{ data, commit, notice, notify, recoveryError }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
