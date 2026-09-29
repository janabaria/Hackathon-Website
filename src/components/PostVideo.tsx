import { T } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { playableVideoUrl } from '../services/reelMedia';
export function PostVideo({ url, thumbnail }: { url: string; thumbnail?: string }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    setSrc('');
    playableVideoUrl(url)
      .then((s) => {
        if (!cancelled) setSrc(s);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url, retry]);
  return error ? (
    <div className="video-error">
      <p>
        <T>Could not load this video.</T>
      </p>
      <button className="button secondary" onClick={() => setRetry((r) => r + 1)}>
        <T>Retry video</T>
      </button>
    </div>
  ) : src ? (
    <video
      className="post-video"
      src={src}
      poster={thumbnail || undefined}
      controls
      playsInline
      preload="metadata"
      onError={() => setError(true)}
    />
  ) : (
    <p role="status">
      <T>Loading video…</T>
    </p>
  );
}
