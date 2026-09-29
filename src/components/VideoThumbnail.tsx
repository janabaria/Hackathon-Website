import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { readImage } from '../lib/utils';
export function VideoThumbnail({
  value,
  onChange,
  onBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="thumbnail-picker">
      <label className="upload-field">
        <span>
          <ImagePlus size={18} /> Video thumbnail{' '}
          <small>Optional · PNG, JPG, WebP or GIF · up to 1 MB</small>
        </span>
        <input
          ref={input}
          disabled={reading}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setReading(true);
            onBusy(true);
            setError('');
            try {
              onChange(await readImage(file));
            } catch (e) {
              setError((e as Error).message);
              if (input.current) input.current.value = '';
            } finally {
              setReading(false);
              onBusy(false);
            }
          }}
        />
      </label>
      {reading && <p role="status">Reading thumbnail…</p>}
      {value && (
        <div className="thumbnail-preview">
          <img src={value} alt="Video thumbnail preview" />
          <button
            type="button"
            className="text-button"
            disabled={reading}
            onClick={() => {
              onChange('');
              if (input.current) input.current.value = '';
            }}
          >
            Remove thumbnail
          </button>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
