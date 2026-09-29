import { VideoThumbnail } from './VideoThumbnail';
import { T } from '../lib/i18n';
import { uploadReelVideo, validateVideo } from '../services/reelMedia';

import { useEffect, useRef, useState } from 'react';

import { ImagePlus, Send } from 'lucide-react';

import { Modal } from './ui';

import { useApp } from '../state/AppProvider';

import { newId, readImage } from '../lib/utils';

export function PostComposer({ onClose }: { onClose: () => void }) {
  const { data, commit, notify } = useApp();

  const [caption, setCaption] = useState('');

  const [topic, setTopic] = useState('');

  const [image, setImage] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [thumbnailBusy, setThumbnailBusy] = useState(false);

  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [videoUrl, setVideoUrl] = useState('');

  const [videoPreview, setVideoPreview] = useState('');

  const [uploaded, setUploaded] = useState('');

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState('');

  const busy = useRef(false);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreview('');
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const [loadingImage, setLoadingImage] = useState(false);

  return (
    <Modal title="Share a little learning" onClose={() => !busy.current && onClose()}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();

          if (!caption.trim() || !topic.trim() || busy.current || thumbnailBusy) return;

          busy.current = true;
          setUploading(true);
          setError('');

          try {
            const mediaUrl = videoFile
              ? uploaded || (await uploadReelVideo(videoFile, data.profile.id))
              : videoUrl.trim();

            if (videoFile) setUploaded(mediaUrl);

            if (
              await commit({
                type: 'post/add',

                post: {
                  id: newId(),

                  authorId: data.profile.id,

                  caption: caption.trim(),

                  topic: topic.trim(),

                  image,
                  thumbnail: mediaUrl ? thumbnail : '',
                  videoUrl: mediaUrl,

                  createdAt: new Date().toISOString(),

                  liked: false,

                  saved: false,

                  shares: 0,
                },
              })
            ) {
              notify('Your post is saved.');

              onClose();
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.');
          } finally {
            busy.current = false;
            setUploading(false);
          }
        }}
      >
        <fieldset disabled={uploading} className="plain-fieldset">
          <label>
            <T>What did you learn?</T>
            <textarea
              autoFocus

              required

              maxLength={2000}

              value={caption}

              onChange={(e) => setCaption(e.target.value)}

              placeholder="A small discovery, in your own words…"
            />
          </label>

          <label>
            <T>Topic</T>
            <input
              required

              maxLength={120}

              value={topic}

              onChange={(e) => setTopic(e.target.value)}

              placeholder="Add a topic"
            />
          </label>

          <label className="upload-field">
            <span>
              <ImagePlus size={18} />
              <T>Add an image</T>
              <small>
                <T>Optional · up to 1 MB</T>
              </small>
            </span>

            <input
              type="file"

              accept="image/png,image/jpeg,image/webp,image/gif"

              onChange={async (event) => {
                const file = event.target.files?.[0];

                if (!file) return;

                setLoadingImage(true);

                try {
                  setImage(await readImage(file));
                } catch (error) {
                  notify((error as Error).message);

                  event.target.value = '';
                } finally {
                  setLoadingImage(false);
                }
              }}
            />
          </label>

          {image && (
            <div className="image-preview">
              <img src={image} alt="Your upload" />

              <button type="button" className="text-button" onClick={() => setImage('')}>
                <T>Remove image</T>
              </button>
            </div>
          )}

          <label className="upload-field">
            <T>Attach a video from your device</T>
            <small>
              <T>Optional · MP4 or WebM · up to 50 MB</T>
            </small>
            <input
              type="file"
              accept="video/mp4,video/webm,.mp4,.webm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  validateVideo(file);
                  setVideoFile(file);
                  setUploaded('');
                  setVideoUrl('');
                  setError('');
                } catch (err) {
                  setError((err as Error).message);
                  e.target.value = '';
                }
              }}
            />
          </label>

          {videoPreview ? (
            <div>
              <video
                className="post-video"
                controls
                poster={thumbnail || undefined}
                src={videoPreview}
              />
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setVideoFile(null);
                  setUploaded('');
                }}
              >
                <T>Remove video</T>
              </button>
            </div>
          ) : (
            <label>
              <T>Or use a video URL</T>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://… (optional)"
              />
            </label>
          )}

          {(videoFile || videoUrl.trim()) && (
            <VideoThumbnail value={thumbnail} onChange={setThumbnail} onBusy={setThumbnailBusy} />
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="button primary full-width"

            disabled={thumbnailBusy || loadingImage || !caption.trim() || !topic.trim()}
          >
            <Send size={17} />

            {loadingImage ? 'Reading image…' : 'Publish post'}
          </button>
        </fieldset>
      </form>
    </Modal>
  );
}
