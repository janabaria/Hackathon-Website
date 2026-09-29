import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Modal } from './ui';
type Review = {
  text: string;
  sources: { uri: string; title: string }[];
  searchSuggestions: string;
  grounded: boolean;
};
export function PostReview({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const run = async () => {
    setBusy(true);
    setError('');
    try {
      if (!supabase) throw new Error('Sign in to use AI reviews.');
      const { data, error } = await supabase.functions.invoke('review-post', { body: { postId } });
      if (error) {
        let message = 'Review unavailable. Please try again.';
        try {
          message = (await error.context.json()).error || message;
        } catch {}
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      setReview(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className="text-button ai-review-button" onClick={() => setOpen(true)}>
        <Sparkles size={16} />
        Check accuracy with AI
      </button>
      {open && (
        <Modal title="AI accuracy review" onClose={() => setOpen(false)}>
          <p>
            Send this post’s text to Gemini for an accuracy review. Source links appear when web
            search is enabled. Images and videos are not analyzed. AI can make mistakes; check the
            linked evidence.
          </p>
          {!review && (
            <button className="button primary" disabled={busy} onClick={() => void run()}>
              {busy ? 'Reviewing…' : 'Review post text'}
            </button>
          )}
          {error && <p role="alert">{error}</p>}
          {review && (
            <>
              <p className="muted">
                {review.grounded
                  ? 'Web sources found'
                  : 'No web evidence returned — this is not a verified fact check.'}
              </p>
              <div className="ai-review-text">{review.text}</div>
              <ul>
                {review.sources
                  .filter((s) => /^https:\/\//.test(s.uri))
                  .map((s) => (
                    <li key={s.uri}>
                      <a href={s.uri} target="_blank" rel="noreferrer">
                        {s.title || 'Source'}
                      </a>
                    </li>
                  ))}
              </ul>
              {review.searchSuggestions && (
                <iframe
                  title="Google Search suggestions"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={review.searchSuggestions}
                  className="search-suggestions"
                />
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}
