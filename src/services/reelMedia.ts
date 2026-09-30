import { supabase } from './supabase';

export const REEL_BUCKET = 'reel-videos';
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export function validateVideo(file: Pick<File, 'type' | 'size'>) {
  if (!['video/mp4', 'video/webm'].includes(file.type))
    throw new Error('Choose an MP4 or WebM video.');
  if (!file.size) throw new Error('This file is empty. Choose another video.');
  if (file.size > MAX_VIDEO_BYTES) throw new Error('Choose a video smaller than 50 MB.');
}
export function storedVideoPath(
  url: string,
  projectUrl = import.meta.env.VITE_SUPABASE_URL,
): string | null {
  if (!projectUrl) return null;
  try {
    const parsed = new URL(url);
    const base = new URL(projectUrl);
    const prefix = ['authenticated', 'public', 'sign']
      .map((kind) => `/storage/v1/object/${kind}/${REEL_BUCKET}/`)
      .find((value) => parsed.pathname.startsWith(value));
    return parsed.origin === base.origin && prefix
      ? decodeURIComponent(parsed.pathname.slice(prefix.length))
      : null;
  } catch {
    return null;
  }
}
export async function uploadReelVideo(file: File, userId: string): Promise<string> {
  validateVideo(file);
  if (!supabase) throw new Error('Connect Supabase and sign in to upload video files.');
  const path = `${userId}/${crypto.randomUUID()}.${file.type === 'video/mp4' ? 'mp4' : 'webm'}`;
  const { error } = await supabase.storage
    .from(REEL_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error)
    throw new Error(
      `Video upload failed: ${error.message}. If storage is not set up yet, run supabase/003_reel_uploads.sql.`,
    );
  // Persist a stable locator, never an expiring signed playback URL.
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/${REEL_BUCKET}/${path}`;
}
export async function playableVideoUrl(url: string): Promise<string> {
  const path = storedVideoPath(url);
  if (!path) return url;
  if (!supabase) throw new Error('Sign in to play this video.');
  const { data, error } = await supabase.storage.from(REEL_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
