import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, PenLine, Save, Send } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { PageHeader } from '../components/ui';
import { newId } from '../lib/utils';

export function StudioPage() {
  const { data, commit, notify } = useApp();
  const [text, setText] = useState(data.draft);
  const [topic, setTopic] = useState('');
  const [published, setPublished] = useState(false);
  const navigate = useNavigate();
  const checks = [
    { label: 'Give the idea enough context.', pass: text.trim().split(/\s+/).length >= 20 },
    { label: 'Add an example or analogy.', pass: /example|imagine|like |such as/i.test(text) },
    {
      label: 'Keep sentences short and clear.',
      pass:
        text.trim().length > 0 &&
        !text.split(/[.!?]/).some((s) => s.trim().split(/\s+/).length > 28),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="CREATOR STUDIO"
        title="Learn it. Explain it. Make it yours."
        description="Try explaining one idea to someone who’s hearing it for the first time."
      />
      <div className="studio-grid">
        <form
          className="card editor-card"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim() || !topic.trim() || published) return;
            if (
              await commit({
                type: 'post/add',
                post: {
                  id: newId(),
                  caption: text.trim(),
                  topic: topic.trim(),
                  image: '',
                  authorId: data.profile.id,
                  createdAt: new Date().toISOString(),
                  liked: false,
                  saved: false,
                  shares: 0,
                },
              })
            ) {
              setPublished(true);
              await commit({ type: 'draft/save', text: '' });
              notify('Your explanation is in the feed.');
              navigate('/');
            }
          }}
        >
          <div className="section-heading">
            <h2>
              <PenLine size={20} />
              Your explanation
            </h2>
            <small>{text.length}/2000</small>
          </div>
          <label className="sr-only" htmlFor="explanation">
            Your explanation
          </label>
          <textarea
            id="explanation"
            required
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The simple version…&#10;&#10;For example…&#10;&#10;One thing I’m still figuring out…"
          />
          <label>
            Topic
            <input
              required
              maxLength={120}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              onClick={async () => {
                if (await commit({ type: 'draft/save', text })) notify('Draft saved privately.');
              }}
            >
              <Save size={17} />
              Save draft
            </button>
            <button
              className="button primary"
              disabled={!text.trim() || !topic.trim() || published}
            >
              <Send size={17} />
              Publish
            </button>
          </div>
        </form>
        <aside className="card writing-guide">
          <span className="eyebrow">THE FEYNMAN APPROACH</span>
          <h2>Clarity is a practice.</h2>
          <p>Use everyday language. Connect it to something familiar. Notice the gaps.</p>
          <ul>
            {checks.map((check) => (
              <li key={check.label} className={check.pass ? 'passed' : ''}>
                <Check size={18} />
                {check.label}
              </li>
            ))}
          </ul>
          <small>
            A simple local writing checklist. It does not check factual accuracy or call an AI
            service.
          </small>
        </aside>
      </div>
    </>
  );
}
