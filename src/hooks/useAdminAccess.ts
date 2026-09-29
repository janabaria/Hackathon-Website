import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useApp } from '../state/AppProvider';
export function useAdminAccess() {
  const { userId } = useApp();
  const [adminId, setAdminId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (userId && supabase)
      void supabase.rpc('is_app_admin').then(({ data, error }) => {
        if (active) setAdminId(!error && data === true ? userId : null);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  return !!userId && adminId === userId;
}
