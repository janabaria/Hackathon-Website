import { ReelPreview } from '../components/ReelPreview';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { T } from '../lib/i18n';
import { useSearchParams } from 'react-router-dom';
import { DeleteButton } from '../components/DeleteButton';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Avatar, EmptyState, Modal, Topic } from '../components/ui';
import { ContentActions } from '../components/ContentActions';
import { newId } from '../lib/utils';
import type { Reel } from '../domain/schema';
import { playableVideoUrl, uploadReelVideo, validateVideo } from '../services/reelMedia';
export function ReelsPage() {
  const { data, commit, notify } = useApp();
  const [params] = useSearchParams();
  const targetId = params.get('id');
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const targetIndex = targetId ? data.reels.findIndex((r) => r.id === targetId) : -1;
    if (targetIndex >= 0) {
      setIndex(targetIndex);
      track.current?.scrollTo({ top: targetIndex * track.current.clientHeight });
    } else if (index >= data.reels.length) {
      setIndex(Math.max(0, data.reels.length - 1));
      track.current?.scrollTo({
        top: Math.max(0, data.reels.length - 1) * track.current.clientHeight,
      });
    }
  }, [targetId, data.reels.length]);
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [caption, setCaption] = useState('');
  const [topic, setTopic] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [source, setSource] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const move = (direction: number) =>
    track.current?.children[
      Math.max(0, Math.min(data.reels.length - 1, index + direction))
    ]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return (
    <>
      <div className="reels-toolbar">
        <strong>Learn in a minute</strong>
        <div className="button-row">
          <button className="button secondary" onClick={() => setBrowse(true)}>
            Browse reels
          </button>
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Add reel
          </button>
        </div>
      </div>
      {browse && (
        <Modal title="Browse reels" onClose={() => setBrowse(false)}>
          <div className="reels-browse-grid">
            {data.reels.map((reel, i) => (
              <button
                key={reel.id}
                className="reel-browse-item"
                onClick={() => {
                  setBrowse(false);
                  setIndex(i);
                  track.current?.scrollTo({
                    top: i * track.current.clientHeight,
                    behavior: 'instant',
                  });
                }}
              >
                <ReelPreview reel={reel} />
                <strong>{reel.title}</strong>
              </button>
            ))}
          </div>
          {!data.reels.length && <p>No reels yet.</p>}
        </Modal>
      )}
      {data.reels.length ? (
        <div className="reels-shell">
          <div
            className="reels-track"
            ref={track}
            onScroll={() => {
              if (track.current)
                setIndex(Math.round(track.current.scrollTop / track.current.clientHeight));
            }}
          >
            {data.reels.map((reel, i) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                active={i === index}
                muted={muted}
                onMuteChange={setMuted}
              />
            ))}
          </div>
          <div className="reel-navigation">
            <button
              className="icon-button"
              aria-label="Previous reel"
              disabled={index === 0}
              onClick={() => move(-1)}
            >
              <ChevronUp />
            </button>
            <span>
              {index + 1} / {data.reels.length}
            </span>
            <button
              className="icon-button"
              aria-label="Next reel"
              disabled={index === data.reels.length - 1}
              onClick={() => move(1)}
            >
              <ChevronDown />
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Video}
            title="Your first minute starts here."
            description="Upload a video and share what you learned."
            action={
              <button className="button primary" onClick={() => setOpen(true)}>
                <T>Add your first reel</T>
              </button>
            }
          />
        </div>
      )}
      {open && (
        <Modal
          title="Add a learning reel"
          onClose={() => {
            if (!submitting.current) setOpen(false);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (submitting.current || thumbnailBusy) return;
              if (![title, caption, topic].every((s) => s.trim())) return;
              setFormError('');
              if (source === 'file' && !file) {
                setFormError('Choose a video file first.');
                return;
              }
              submitting.current = true;
              setUploading(true);
              try {
                let mediaUrl = videoUrl.trim();
                if (source === 'file') {
                  mediaUrl = uploadedUrl || (await uploadReelVideo(file!, data.profile.id));
                  setUploadedUrl(mediaUrl);
                }
                if (
                  await commit({
                    type: 'reel/add',
                    reel: {
                      id: newId(),
                      authorId: data.profile.id,
                      title: title.trim(),
                      caption: caption.trim(),
                      topic: topic.trim(),
                      videoUrl: mediaUrl,
                      thumbnail,
                      createdAt: new Date().toISOString(),
                      liked: false,
                      saved: false,
                      shares: 0,
                    },
                  })
                ) {
                  setOpen(false);
                  setTitle('');
                  setThumbnail('');
                  setCaption('');
                  setTopic('');
                  setVideoUrl('');
                  setFile(null);
                  setUploadedUrl('');
                  setIndex(0);
                  track.current?.scrollTo(0, 0);
                  notify('Reel added.');
                } else {
                  setFormError(
                    'The reel was not saved. Check the message below and try again. Your selected video is kept.',
                  );
                }
              } catch (error) {
                setFormError(
                  error instanceof Error ? error.message : 'Upload failed. Please try again.',
                );
              } finally {
                submitting.current = false;
                setUploading(false);
              }
            }}
          >
            <fieldset
              disabled={uploading}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              <label>
                <T>Title</T>
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  aria-pressed={source === 'file'}
                  onClick={() => setSource('file')}
                >
                  <T>Upload video</T>
                </button>
                <button
                  type="button"
                  className="text-button"
                  aria-pressed={source === 'link'}
                  onClick={() => setSource('link')}
                >
                  <T>Use a link instead</T>
                </button>
              </div>
              {source === 'file' ? (
                <label>
                  <T>Video file</T>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,.mp4,.webm"
                    onChange={(event) => {
                      const selected = event.target.files?.[0];
                      if (!selected) return;
                      setFormError('');
                      try {
                        validateVideo(selected);
                        setFile(selected);
                        setUploadedUrl('');
                      } catch (error) {
                        setFile(null);
                        setUploadedUrl('');
                        event.target.value = '';
                        setFormError((error as Error).message);
                      }
                    }}
                  />
                  <small>
                    <T>MP4 or WebM · up to 50 MB</T>
                  </small>
                  {file && (
                    <small>
                      {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </small>
                  )}
                  {preview && (
                    <video
                      src={preview}
                      poster={thumbnail || undefined}
                      controls
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', maxHeight: 240, borderRadius: 12 }}
                    />
                  )}
                </label>
              ) : (
                <label>
                  <T>Video URL</T>
                  <input
                    type="url"
                    required
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://…/video.mp4"
                  />
                  <small>
                    <T>Use a direct MP4 or WebM link. YouTube page links are not video files.</T>
                  </small>
                </label>
              )}
              <label>
                <T>Topic</T>
                <input
                  required
                  maxLength={120}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </label>
              <label>
                <T>Takeaway</T>
                <textarea
                  required
                  maxLength={2000}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <VideoThumbnail value={thumbnail} onChange={setThumbnail} onBusy={setThumbnailBusy} />
            </fieldset>
            {formError && (
              <p role="alert" className="form-error">
                {formError}
              </p>
            )}
            <button className="button primary full-width" disabled={uploading || thumbnailBusy}>
              {uploading ? 'Uploading and saving…' : 'Add reel'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function ReelCard({
  reel,
  active,
  muted,
  onMuteChange,
}: {
  reel: Reel;
  active: boolean;
  muted: boolean;
  onMuteChange: (value: boolean) => void;
}) {
  const { data } = useApp();
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [retry, setRetry] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const manuallyPaused = useRef(false);
  useEffect(() => {
    let current = true;
    setFailed(false);
    setPlaybackUrl('');
    if (active)
      void playableVideoUrl(reel.videoUrl)
        .then((url) => {
          if (current) setPlaybackUrl(url);
        })
        .catch(() => {
          if (current) setFailed(true);
        });
    return () => {
      current = false;
    };
  }, [reel.videoUrl, active, retry]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    manuallyPaused.current = false;
    setBlocked(false);
    setPosition(0);
    setDuration(0);
    const syncPlayback = () => {
      if (active && !document.hidden && !manuallyPaused.current) {
        void video.play().catch(() => {
          if (ref.current === video && !document.hidden) setBlocked(true);
        });
      } else {
        video.pause();
      }
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      document.removeEventListener('visibilitychange', syncPlayback);
      video.pause();
    };
  }, [active, playbackUrl, failed]);
  const togglePlayback = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      manuallyPaused.current = false;
      void video.play().catch(() => setBlocked(true));
    } else {
      manuallyPaused.current = true;
      video.pause();
    }
  };
  return (
    <article
      className="reel-card"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button,a,input,dialog')) togglePlayback();
      }}
    >
      {playbackUrl && !failed && (
        <button
          className="reel-tap-target"
          aria-label={playing ? 'Pause reel' : 'Play reel'}
          onClick={togglePlayback}
        >
          {!playing && <Play size={54} fill="currentColor" />}
        </button>
      )}
      <Topic topic={reel.topic} />
      {reel.authorId === data.profile.id && (
        <div className="reel-delete">
          <DeleteButton label="reel" action={{ type: 'content/delete', id: reel.id }} />
        </div>
      )}
      <div className="video-stage">
        {failed ? (
          <div className="video-error">
            <Video />
            <p>
              <T>This video could not be loaded.</T>
            </p>
            <small>
              <T>
                Retry to refresh playback access. MP4/WebM playback also depends on the video codec
                supported by your browser.
              </T>
            </small>
            <button className="button secondary" onClick={() => setRetry((value) => value + 1)}>
              <T>Retry video</T>
            </button>
          </div>
        ) : playbackUrl ? (
          <video
            ref={ref}
            src={playbackUrl}
            poster={reel.thumbnail || undefined}
            muted={muted}
            loop
            playsInline
            preload="metadata"
            onPlay={() => {
              setPlaying(true);
              setBlocked(false);
            }}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) =>
              setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)
            }
            onDurationChange={(e) =>
              setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)
            }
            onError={() => setFailed(true)}
          />
        ) : (
          <>
            {reel.thumbnail && (
              <img className="reel-poster" src={reel.thumbnail} alt={reel.title} />
            )}
            <p>{active ? 'Loading video…' : 'Scroll here to play'}</p>
          </>
        )}
      </div>
      {playbackUrl && !failed && (
        <div className="reel-player-controls">
          {blocked && (
            <button
              className="button primary"
              onClick={() => {
                const video = ref.current;
                if (!video) return;
                video.muted = false;
                onMuteChange(false);
                manuallyPaused.current = false;
                void video
                  .play()
                  .then(() => setBlocked(false))
                  .catch(() => setBlocked(true));
              }}
            >
              <T>Enable sound and play</T>
            </button>
          )}
          <div className="reel-control-buttons">
            <button
              type="button"
              onClick={() => {
                const video = ref.current;
                if (video) video.currentTime = Math.max(0, video.currentTime - 10);
              }}
              disabled={!duration}
              aria-label="Backward 10 seconds"
            >
              <RotateCcw size={21} />
              <span className="seek-number">10</span>
            </button>
            <button
              type="button"
              className="reel-play-button"
              aria-label={playing ? 'Pause video' : 'Play video'}
              title={playing ? 'Pause' : 'Play'}
              onClick={() => {
                const video = ref.current;
                if (!video) return;
                if (video.paused) {
                  manuallyPaused.current = false;
                  void video.play().catch(() => setBlocked(true));
                } else {
                  manuallyPaused.current = true;
                  video.pause();
                }
              }}
            >
              {playing ? (
                <Pause size={23} fill="currentColor" />
              ) : (
                <Play size={23} fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                const video = ref.current;
                if (video) video.muted = !muted;
                onMuteChange(!muted);
              }}
              aria-label={muted ? 'Unmute video' : 'Mute video'}
              title={muted ? 'Unmute' : 'Mute'}
              aria-pressed={muted}
            >
              {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
            </button>
            <button
              type="button"
              onClick={() => {
                const video = ref.current;
                if (video) video.currentTime = Math.min(duration, video.currentTime + 10);
              }}
              disabled={!duration}
              aria-label="Forward 10 seconds"
            >
              <RotateCw size={21} />
              <span className="seek-number">10</span>
            </button>
          </div>
          <input
            type="range"
            aria-label="Video position"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(position, duration || 1)}
            disabled={!duration}
            onChange={(e) => {
              const video = ref.current;
              if (video) {
                video.currentTime = Number(e.target.value);
                setPosition(video.currentTime);
              }
            }}
          />
          <small>
            {Math.floor(position / 60)}:
            {Math.floor(position % 60)
              .toString()
              .padStart(2, '0')}{' '}
            / {Math.floor(duration / 60)}:
            {Math.floor(duration % 60)
              .toString()
              .padStart(2, '0')}
          </small>
        </div>
      )}
      <div className="reel-copy">
        <h2>{reel.title}</h2>
        <p>{reel.caption}</p>
        <div className="person-row">
          <Avatar id={reel.authorId} />
          <Avatar id={reel.authorId} nameOnly />
        </div>
      </div>
      <div className="reel-social-rail">
        <ContentActions content={reel} />
      </div>
    </article>
  );
}
