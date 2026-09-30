import { T } from '../lib/i18n';
import { ArrowUpRight, BookOpen, Compass, Plus, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../state/AppProvider';
import { EmptyState, PageHeader, Topic, Avatar } from '../components/ui';
import { PostCard } from '../components/PostCard';
import { PodsSection } from './PodsSection';

export function HomePage({ onCreate }: { onCreate: () => void }) {
  const { data } = useApp();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const [followingOnly, setFollowingOnly] = useState(false);
  const topics = [...new Set([...data.posts, ...data.reels].map((p) => p.topic))];
  const visible = data.posts.filter(
    (p) =>
      (!filter || p.topic === filter) && (!followingOnly || data.following.includes(p.authorId)),
  );
  visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pods = params.get('tab') === 'pods';
  return (
    <>
      <PageHeader
        eyebrow="DISCOVER SOMETHING NEW"
        title="Your learning starts here."
        description="A space for good questions and small discoveries."
      />
      <div className="page-tabs" role="tablist" aria-label="Home view">
        <button role="tab" aria-selected={!pods} onClick={() => setParams({})}>
          <Compass size={17} />
          <T>Your feed</T>
        </button>
        <button role="tab" aria-selected={pods} onClick={() => setParams({ tab: 'pods' })}>
          <Users size={17} />
          <T>Focus pods</T>
        </button>
      </div>
      {pods ? (
        <PodsSection initialGoal={params.get('goal') ?? ''} />
      ) : (
        <div className="home-grid">
          <section>
            <div className="card composer">
              <Avatar id={data.profile.id} />
              <button onClick={onCreate}>
                <T>What did you learn today?</T>
              </button>
              <button className="icon-button" aria-label="New post" onClick={onCreate}>
                <Plus size={20} />
              </button>
            </div>
            {data.posts.length > 0 && (
              <div className="filter-row">
                <button
                  className={`chip ${!followingOnly ? 'selected' : ''}`}
                  onClick={() => setFollowingOnly(false)}
                >
                  <T>All posts</T>
                </button>
                <button
                  className={`chip ${followingOnly ? 'selected' : ''}`}
                  onClick={() => setFollowingOnly(true)}
                >
                  <T>Following</T>
                </button>
                <select
                  aria-label="Filter topic"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">
                    <T>All topics</T>
                  </option>
                  {topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            {visible.length ? (
              <div className="feed">
                {visible.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="card">
                <EmptyState
                  icon={BookOpen}
                  title={
                    data.posts.length
                      ? 'Nothing in this view yet.'
                      : 'The first discovery is yours.'
                  }
                  description={
                    data.posts.length
                      ? 'Try all posts or a different topic.'
                      : 'Share something you learned. Your posts and conversations will find a home here.'
                  }
                  action={
                    <button className="button primary" onClick={onCreate}>
                      <Plus size={17} />
                      <T>Share your first learning</T>
                    </button>
                  }
                />
              </div>
            )}
            <div className="loop-strip">
              <span>
                01{' '}
                <strong>
                  <T>Discover</T>
                </strong>
              </span>
              <i>→</i>
              <span>
                02{' '}
                <strong>
                  <T>Focus</T>
                </strong>
              </span>
              <i>→</i>
              <span>
                03{' '}
                <strong>
                  <T>Practice</T>
                </strong>
              </span>
              <i>→</i>
              <span>
                04{' '}
                <strong>
                  <T>Share</T>
                </strong>
              </span>
            </div>
          </section>
          <aside className="right-rail">
            <section className="focus-invite">
              <span className="eyebrow">
                <T>A LITTLE SPACE TO FOCUS</T>
              </span>
              <h2>
                <T>Turn curiosity</T>
                <br />
                <T>into progress.</T>
              </h2>
              <p>
                <T>Set an intention. Give it your attention.</T>
              </p>
              <button className="button" onClick={() => setParams({ tab: 'pods' })}>
                <T>Create a focus pod</T>
                <ArrowUpRight size={17} />
              </button>
            </section>
            <section className="card rail-card">
              <h3>
                <T>Your topics</T>
              </h3>
              {topics.length ? (
                <div className="tag-list">
                  {topics.map((topic) => (
                    <button key={topic} onClick={() => setFilter(topic)}>
                      <Topic topic={topic} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  <T>Topics will appear as you add learning posts.</T>
                </p>
              )}
            </section>
            <section className="card rail-card">
              <h3>
                <T>Your learning circle</T>
              </h3>
              {data.accounts.length ? (
                data.accounts.slice(0, 4).map((p) => (
                  <div className="person-row" key={p.id}>
                    <Avatar id={p.id} />
                    <Avatar id={p.id} nameOnly />
                  </div>
                ))
              ) : (
                <p className="muted">
                  <T>No accounts added yet. Your people will appear here.</T>
                </p>
              )}
              <Link to="/search" className="text-link">
                <T>Explore your workspace</T>
                <ArrowUpRight size={14} />
              </Link>
            </section>
            <p className="rail-footnote">
              <T>One useful idea at a time.</T>
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
