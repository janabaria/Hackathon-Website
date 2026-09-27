import { describe, it, expect, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), sign: vi.fn() }));
vi.mock('./supabase', () => ({
  supabase: { storage: { from: () => ({ upload: mocks.upload, createSignedUrl: mocks.sign }) } },
}));
import {
  validateVideo,
  storedVideoPath,
  uploadReelVideo,
  playableVideoUrl,
  MAX_VIDEO_BYTES,
} from './reelMedia';
beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
  vi.clearAllMocks();
});
describe('reel file uploads', () => {
  it('rejects unsupported, empty, and oversized files', () => {
    expect(() => validateVideo({ type: 'image/png', size: 10 })).toThrow('MP4');
    expect(() => validateVideo({ type: 'video/mp4', size: 0 })).toThrow('empty');
    expect(() => validateVideo({ type: 'video/webm', size: MAX_VIDEO_BYTES + 1 })).toThrow('50 MB');
    expect(() => validateVideo({ type: 'video/mp4', size: 1024 })).not.toThrow();
  });
  it('recognizes only our private storage locators', () => {
    expect(
      storedVideoPath(
        'https://project.supabase.co/storage/v1/object/authenticated/reel-videos/u/a.mp4',
      ),
    ).toBe('u/a.mp4');
    expect(
      storedVideoPath('https://other.example/storage/v1/object/authenticated/reel-videos/u/a.mp4'),
    ).toBeNull();
  });
  it('stores a stable locator and signs only for playback', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.sign.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/video' },
      error: null,
    });
    const url = await uploadReelVideo(
      new File(['video'], 'lesson.mp4', { type: 'video/mp4' }),
      'user-id',
    );
    expect(url).toContain('/authenticated/reel-videos/user-id/');
    expect(mocks.upload.mock.calls[0][2].upsert).toBe(false);
    expect(await playableVideoUrl(url)).toBe('https://signed.example/video');
    expect(mocks.sign).toHaveBeenCalledWith(expect.stringContaining('user-id/'), 3600);
  });
  it('does not report success when storage rejects the upload', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'Bucket not found' } });
    await expect(
      uploadReelVideo(new File(['x'], 'x.mp4', { type: 'video/mp4' }), 'u'),
    ).rejects.toThrow('003_reel_uploads.sql');
  });
  it('keeps existing external video links working', async () => {
    expect(await playableVideoUrl('https://example.com/lesson.mp4')).toBe(
      'https://example.com/lesson.mp4',
    );
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
