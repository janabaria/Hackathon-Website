import { useState } from 'react';
import { ImagePlus, Send } from 'lucide-react';
import { Modal } from './ui';
import { useApp } from '../state/AppProvider';
import { newId, readImage } from '../lib/utils';

export function PostComposer({ onClose }: { onClose: () => void }) {
  const { data, commit, notify } = useApp();
  const [caption, setCaption] = useState('');
  const [topic, setTopic] = useState('');
  const [image, setImage] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);
  return (
    <Modal title="Share a little learning" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!caption.trim() || !topic.trim()) return;
          if (
            commit({
              type: 'post/add',
              post: {
                id: newId(),
                authorId: data.profile.id,
                caption: caption.trim(),
                topic: topic.trim(),
                image,
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
        }}
      >
        <label>
          What did you learn?
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
          Topic
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
            Add an image <small>Optional · up to 1 MB</small>
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
              Remove image
            </button>
          </div>
        )}
        <button
          className="button primary full-width"
          disabled={loadingImage || !caption.trim() || !topic.trim()}
        >
          <Send size={17} />
          {loadingImage ? 'Reading image…' : 'Publish post'}
        </button>
      </form>
    </Modal>
  );
}
