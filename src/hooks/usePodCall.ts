import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Member } from './usePodRoom';
type Peer = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  candidates: RTCIceCandidateInit[];
};
export function usePodCall(podId: string, connectionId: string, members: Member[]) {
  const [stream, setStream] = useState<MediaStream | null>(null),
    [remote, setRemote] = useState<Record<string, MediaStream>>({}),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [mic, setMic] = useState(false),
    [camera, setCamera] = useState(false);
  const local = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, Peer>());
  const live = useRef(true);
  const activeIds = members
    .filter((m) => m.in_call && m.id !== connectionId)
    .map((m) => m.id)
    .sort()
    .join(',');
  const memberIds = useRef(activeIds);
  memberIds.current = activeIds;
  const leave = useCallback(() => {
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    setStream(null);
    setMic(false);
    setCamera(false);
    peers.current.forEach((p) => p.pc.close());
    peers.current.clear();
    setRemote({});
    if (connectionId && supabase)
      void supabase.from('pod_presence').update({ in_call: false }).eq('id', connectionId);
  }, [connectionId]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      leave();
    };
  }, [leave]);
  const join = async (video: boolean) => {
    if (busy || !connectionId) return;
    setBusy(true);
    setError('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      if (!live.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      const result = await supabase!
        .from('pod_presence')
        .update({ in_call: true })
        .eq('id', connectionId);
      if (result.error) {
        media.getTracks().forEach((t) => t.stop());
        throw result.error;
      }
      if (!live.current) {
        media.getTracks().forEach((t) => t.stop());
        void supabase!.from('pod_presence').update({ in_call: false }).eq('id', connectionId);
        return;
      }
      local.current = media;
      setStream(media);
      setMic(true);
      setCamera(video);
    } catch (e) {
      setError((e as Error).message || 'Camera or microphone access was denied.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!stream || !connectionId || !supabase) return;
    const db = supabase;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const processed = new Set<string>();
    const send = async (to: string, body: object) => {
      const { error } = await db
        .from('pod_signals')
        .insert({ pod_id: podId, sender_id: connectionId, recipient_id: to, body });
      if (error && !stopped) setError('Call signaling failed: ' + error.message);
    };
    const getPeer = (id: string) => {
      let peer = peers.current.get(id);
      if (peer) return peer;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peer = { pc, makingOffer: false, ignoreOffer: false, candidates: [] };
      peers.current.set(id, peer);
      const p = peer;
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      pc.addTransceiver('video', { direction: 'sendrecv' });
      for (const t of stream.getTracks()) {
        const sender = pc.getTransceivers().find((x) => x.receiver.track.kind === t.kind)?.sender;
        void sender?.replaceTrack(t);
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) void send(id, { candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        if (stopped) return;
        setRemote((old) => {
          const incoming = old[id] ?? new MediaStream();
          if (!incoming.getTracks().some((t) => t.id === e.track.id)) incoming.addTrack(e.track);
          return { ...old, [id]: incoming };
        });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed')
          setError(
            'A peer could not connect. Some networks require a TURN relay; try another network or reconnect.',
          );
      };
      pc.onnegotiationneeded = async () => {
        try {
          p.makingOffer = true;
          await pc.setLocalDescription();
          await send(id, { description: pc.localDescription?.toJSON() });
        } catch {
          if (!stopped) setError('Could not negotiate the call. Leave and rejoin.');
        } finally {
          p.makingOffer = false;
        }
      };
      return p;
    };
    const poll = async () => {
      try {
        for (const id of memberIds.current.split(',').filter(Boolean)) {
          if (connectionId < id) getPeer(id);
        }
        const allowed = new Set(memberIds.current.split(','));
        for (const [id, p] of peers.current) {
          if (!allowed.has(id)) {
            p.pc.close();
            peers.current.delete(id);
            setRemote((old) => {
              const next = { ...old };
              delete next[id];
              return next;
            });
          }
        }
        const { data, error } = await db
          .from('pod_signals')
          .select('*')
          .eq('recipient_id', connectionId)
          .order('created_at');
        if (error) throw error;
        for (const signal of data || []) {
          if (stopped) break;
          if (processed.has(signal.id)) continue;
          processed.add(signal.id);
          const p = getPeer(signal.sender_id);
          const { pc } = p;
          const { description, candidate } = signal.body;
          try {
            if (description) {
              const collision =
                description.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
              p.ignoreOffer = connectionId < signal.sender_id && collision;
              if (p.ignoreOffer) continue;
              if (collision) await pc.setLocalDescription({ type: 'rollback' });
              await pc.setRemoteDescription(description);
              for (const c of p.candidates) await pc.addIceCandidate(c);
              p.candidates = [];
              if (description.type === 'offer') {
                await pc.setLocalDescription();
                await send(signal.sender_id, { description: pc.localDescription?.toJSON() });
              }
            } else if (candidate && !p.ignoreOffer) {
              if (pc.remoteDescription) await pc.addIceCandidate(candidate);
              else p.candidates.push(candidate);
            }
          } catch {
            if (!stopped) setError('A connection was interrupted. Rejoin the call to retry.');
          }
          await db.from('pod_signals').delete().eq('id', signal.id);
        }
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      } finally {
        if (!stopped) timer = setTimeout(poll, 1200);
      }
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [podId, connectionId, stream]);
  const toggleMic = () => {
    const enabled = !mic;
    local.current?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMic(enabled);
  };
  const toggleCamera = async () => {
    if (!local.current) return;
    const existing = local.current.getVideoTracks()[0];
    if (existing) {
      existing.enabled = !camera;
      setCamera(!camera);
      return;
    }
    setBusy(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!live.current || !local.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      const track = media.getVideoTracks()[0];
      local.current.addTrack(track);
      for (const peer of peers.current.values())
        await peer.pc
          .getTransceivers()
          .find((t) => t.receiver.track.kind === 'video')
          ?.sender.replaceTrack(track);
      setCamera(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { stream, remote, error, busy, mic, camera, join, leave, toggleMic, toggleCamera };
}
