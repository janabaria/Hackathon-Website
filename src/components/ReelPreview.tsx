import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import type { Reel } from '../domain/schema';
import { playableVideoUrl } from '../services/reelMedia';
export function ReelPreview({ reel }: { reel: Reel }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    setSrc('');
    if (!reel.thumbnail)
      void playableVideoUrl(reel.videoUrl)
        .then((url) => {
          if (active) setSrc(url.includes('#') ? url : url + '#t=0.1');
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [reel.thumbnail, reel.videoUrl]);
  return (
    <div className="reel-preview-media">
      {reel.thumbnail ? (
        <img src={reel.thumbnail} alt={reel.title} loading="lazy" />
      ) : src && !failed ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          aria-label={`${reel.title} thumbnail`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="reel-preview-placeholder">
          <Video />
          <span>{reel.topic}</span>
        </div>
      )}
    </div>
  );
}
