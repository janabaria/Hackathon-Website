import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Video } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Avatar, EmptyState, Modal, PageHeader, Topic } from '../components/ui';
import { ContentActions } from '../components/ContentActions';
import { newId } from '../lib/utils';
import type { Reel } from '../domain/schema';

export function ReelsPage() {
  const { data, commit, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [topic, setTopic] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const move = (direction: number) =>
    track.current?.children[
      Math.max(0, Math.min(data.reels.length - 1, index + direction))
    ]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return (
    <>
      <PageHeader
        eyebrow="LEARN IN A MINUTE"
        title="Small lessons. Real takeaways."
        description="Your short videos, with space to focus on one idea."
        action={
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Add reel
          </button>
        }
      />
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
              <ReelCard key={reel.id} reel={reel} active={i === index} />
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
            description="Add a video link and a takeaway. Your reel collection is ready to grow."
            action={
              <button className="button primary" onClick={() => setOpen(true)}>
                Add your first reel
              </button>
            }
          />
        </div>
      )}
      {open && (
        <Modal title="Add a learning reel" onClose={() => setOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (![title, caption, topic].every((s) => s.trim())) return;
              if (
                commit({
                  type: 'reel/add',
                  reel: {
                    id: newId(),
                    authorId: data.profile.id,
                    title: title.trim(),
                    caption: caption.trim(),
                    topic: topic.trim(),
                    videoUrl,
                    createdAt: new Date().toISOString(),
                    liked: false,
                    saved: false,
                    shares: 0,
                  },
                })
              ) {
                setOpen(false);
                setTitle('');
                setCaption('');
                setTopic('');
                setVideoUrl('');
                setIndex(0);
                track.current?.scrollTo(0, 0);
                notify('Reel added.');
              }
            }}
          >
            <label>
              Title
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Video URL
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://…/video.mp4"
              />
              <small>Use a direct MP4 or WebM link. YouTube page links are not video files.</small>
            </label>
            <label>
              Topic
              <input
                required
                maxLength={120}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>
            <label>
              Takeaway
              <textarea
                required
                maxLength={2000}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <button className="button primary full-width">Add reel</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function ReelCard({ reel, active }: { reel: Reel; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active) ref.current?.pause();
  }, [active]);
  return (
    <article className="reel-card">
      <Topic topic={reel.topic} />
      <div className="video-stage">
        {failed ? (
          <div className="video-error">
            <Video />
            <p>This video could not be loaded.</p>
            <small>Check that the URL is a publicly accessible video file.</small>
          </div>
        ) : (
          <video
            ref={ref}
            src={reel.videoUrl}
            controls
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="reel-copy">
        <h2>{reel.title}</h2>
        <p>{reel.caption}</p>
        <div className="person-row">
          <Avatar id={reel.authorId} />
          <Avatar id={reel.authorId} nameOnly />
        </div>
        <ContentActions content={reel} />
      </div>
    </article>
  );
}
