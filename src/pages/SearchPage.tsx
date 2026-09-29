import { ReelPreview } from '../components/ReelPreview';
import { T, useT } from '../lib/i18n';
import { useDeferredValue, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Video } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Avatar, EmptyState, PageHeader, Topic } from '../components/ui';
import { PostCard } from '../components/PostCard';
export function SearchPage() {
  const t = useT();
  const { data } = useApp();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('All');
  const query = useDeferredValue((params.get('q') ?? '').trim().toLocaleLowerCase());
  const match = (text: string) => text.toLocaleLowerCase().includes(query);
  const author = (id: string) =>
    [data.profile, ...data.accounts].find((p) => p.id === id)?.name ?? '';
  const profiles = [data.profile, ...data.accounts].filter((p) =>
    match(`${p.name} ${p.bio} ${p.interests.join(' ')} ${p.skills.join(' ')}`),
  );
  const posts = data.posts.filter((p) =>
    params.get('content')
      ? p.id === params.get('content')
      : match(`${p.caption} ${p.topic} ${author(p.authorId)}`),
  );
  const reels = data.reels.filter(
    (p) =>
      !params.get('content') && match(`${p.title} ${p.caption} ${p.topic} ${author(p.authorId)}`),
  );
  const topics = [...new Set([...data.posts, ...data.reels].map((p) => p.topic))].filter(match);
  return (
    <>
      <PageHeader
        eyebrow="FOLLOW YOUR CURIOSITY"
        title="Find your next discovery."
        description="Search profiles, posts, reels, and subjects."
      />
      <label className="search-input search-page-input">
        <Search size={20} />
        <input
          aria-label={t('Search learning content')}
          placeholder={t('Search a topic, person, or idea\u2026')}
          value={params.get('q') ?? ''}
          onChange={(e) => setParams({ q: e.target.value }, { replace: true })}
        />
      </label>
      <div className="page-tabs">
        {['All', 'Profiles', 'Posts', 'Reels'].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            <T>{t}</T>{' '}
            {t === 'Profiles'
              ? profiles.length
              : t === 'Posts'
                ? posts.length
                : t === 'Reels'
                  ? reels.length
                  : ''}
          </button>
        ))}
      </div>
      {tab === 'All' && !params.get('content') && (
        <div className="tag-list search-topics">
          {topics.map((t) => (
            <button className="text-button" key={t} onClick={() => setParams({ q: t })}>
              <Topic topic={t} />
            </button>
          ))}
        </div>
      )}
      {(tab === 'All' || tab === 'Profiles') && !params.get('content') && (
        <>
          <h2>
            <T>Profiles</T>
          </h2>
          <div className="card-grid search-results">
            {profiles.map((p) => (
              <article className="card person-row" key={p.id}>
                <Avatar id={p.id} />
                <div>
                  <Avatar id={p.id} nameOnly />
                  <p className="muted">{p.bio || 'Curious learner'}</p>
                </div>
              </article>
            ))}
          </div>
          {!profiles.length && (
            <p className="muted">
              <T>No matching profiles.</T>
            </p>
          )}
        </>
      )}
      {(tab === 'All' || tab === 'Posts') && (
        <>
          <h2>
            <T>Posts</T>
          </h2>
          <div className="profile-content">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
          {!posts.length && (
            <p className="muted">
              <T>No matching posts.</T>
            </p>
          )}
        </>
      )}
      {(tab === 'All' || tab === 'Reels') && (
        <>
          <h2>
            <T>Reels</T>
          </h2>
          <div className="card-grid">
            {reels.map((r) => (
              <article className="card reel-preview" key={r.id}>
                <Link to={`/reels?id=${r.id}`}>
                  <ReelPreview reel={r} />
                </Link>
                <Video />
                <Topic topic={r.topic} />
                <h3>
                  <Link to={`/reels?id=${r.id}`}>{r.title}</Link>
                </h3>
                <p>{r.caption}</p>
                <Avatar id={r.authorId} nameOnly />
                <Link className="button secondary" to={`/reels?id=${r.id}`}>
                  <T>Watch reel →</T>
                </Link>
              </article>
            ))}
          </div>
          {!reels.length && (
            <p className="muted">
              <T>No matching reels.</T>
            </p>
          )}
        </>
      )}
      {!profiles.length && !posts.length && !reels.length && (
        <EmptyState
          icon={Search}
          title="No matches yet"
          description="Try another subject, name, or keyword."
        />
      )}
    </>
  );
}
