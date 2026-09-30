import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
export type Member = {
  id: string;
  user_id: string;
  pod_id: string;
  seen_at: string;
  in_call: boolean;
};
export type Room = {
  pod_id: string;
  run_id: string;
  quiz_id: string | null;
  mode: 'quiz' | 'blocks';
  question_index: number;
  phase: 'lobby' | 'question' | 'revealed' | 'finished';
};
export type RoomAnswer = {
  user_id: string;
  question_index: number;
  choice: number;
  run_id: string;
};
export function usePodRoom(podId: string, userId: string, owner: boolean) {
  const [connectionId, setConnectionId] = useState(''),
    [members, setMembers] = useState<Member[]>([]),
    [room, setRoom] = useState<Room | null>(null),
    [answers, setAnswers] = useState<RoomAnswer[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    const id = crypto.randomUUID();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let ticks = 0;
    const sync = async () => {
      try {
        if (ticks++ % 5 === 0) {
          const { error } = await db
            .from('pod_presence')
            .update({ seen_at: new Date().toISOString() })
            .eq('id', id);
          if (error) throw error;
          await db.rpc('prune_pod_connections', { pid: podId });
        }
        const [people, state] = await Promise.all([
          db
            .from('pod_presence')
            .select('*')
            .eq('pod_id', podId)
            .gte('seen_at', new Date(Date.now() - 30000).toISOString()),
          db.from('pod_rooms').select('*').eq('pod_id', podId).maybeSingle(),
        ]);
        if (people.error) throw people.error;
        if (state.error) throw state.error;
        if (stopped) return;
        setMembers(people.data as Member[]);
        setRoom(state.data as Room | null);
        if (state.data) {
          const result = await db
            .from('pod_answers')
            .select('*')
            .eq('pod_id', podId)
            .eq('run_id', state.data.run_id);
          if (result.error) throw result.error;
          if (!stopped) setAnswers(result.data as RoomAnswer[]);
        }
        setError('');
      } catch (e) {
        if (!stopped) setError((e as Error).message || 'Room connection lost. Retrying…');
      } finally {
        if (!stopped) timer = setTimeout(sync, 2000);
      }
    };
    void (async () => {
      const added = await db.from('pod_presence').insert({ id, pod_id: podId, user_id: userId });
      if (stopped) {
        await db.from('pod_presence').delete().eq('id', id);
        return;
      }
      if (added.error) {
        setError('Shared room unavailable: ' + added.error.message);
        return;
      }
      setConnectionId(id);
      if (owner) {
        const created = await db
          .from('pod_rooms')
          .upsert({ pod_id: podId }, { onConflict: 'pod_id', ignoreDuplicates: true });
        if (created.error) setError(created.error.message);
      }
      if (!stopped) void sync();
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      setConnectionId('');
      void db.from('pod_presence').delete().eq('id', id);
    };
  }, [podId, userId, owner]);
  const update = async (patch: Partial<Room>) => {
    if (!supabase) return false;
    const result = await supabase
      .from('pod_rooms')
      .update(patch)
      .eq('pod_id', podId)
      .select('*')
      .single();
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setRoom(result.data as Room);
    return true;
  };
  const answer = async (choice: number) => {
    if (!room || !supabase) return;
    const result = await supabase
      .from('pod_answers')
      .insert({
        pod_id: podId,
        run_id: room.run_id,
        user_id: userId,
        question_index: room.question_index,
        choice,
      })
      .select('*')
      .single();
    if (result.error) {
      setError(
        result.error.code === '23505' ? 'Your answer was already submitted.' : result.error.message,
      );
      return;
    }
    setAnswers((prev) => [...prev, result.data as RoomAnswer]);
  };
  return { connectionId, members, room, answers, error, update, answer };
}
