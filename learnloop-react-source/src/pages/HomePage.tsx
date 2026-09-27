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
  const pods = params.get('tab') === 'pods';
  return (
    <>
      <PageHeader
        eyebrow="DISCOVER SOMETHING NEW"
        title="Your learning starts here."
        description="A space for good questions and small discoveries."
        action={
          <button className="button primary" onClick={onCreate}>
            <Plus size={18} />
            Create post
          </button>
        }
      />
      <div className="page-tabs" role="tablist" aria-label="Home view">
        <button role="tab" aria-selected={!pods} onClick={() => setParams({})}>
          <Compass size={17} />
          Your feed
        </button>
        <button role="tab" aria-selected={pods} onClick={() => setParams({ tab: 'pods' })}>
          <Users size={17} />
          Focus pods
        </button>
      </div>
      {pods ? (
        <PodsSection initialGoal={params.get('goal') ?? ''} />
      ) : (
        <div className="home-grid">
          <section>
            <div className="card composer">
              <Avatar id={data.profile.id} />
              <button onClick={onCreate}>What did you learn today?</button>
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
                  All posts
                </button>
                <button
                  className={`chip ${followingOnly ? 'selected' : ''}`}
                  onClick={() => setFollowingOnly(true)}
                >
                  Following
                </button>
                <select
                  aria-label="Filter topic"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">All topics</option>
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
                      Share your first learning
                    </button>
                  }
                />
              </div>
            )}
            <div className="loop-strip">
              <span>
                01 <strong>Discover</strong>
              </span>
              <i>→</i>
              <span>
                02 <strong>Focus</strong>
              </span>
              <i>→</i>
              <span>
                03 <strong>Practice</strong>
              </span>
              <i>→</i>
              <span>
                04 <strong>Share</strong>
              </span>
            </div>
          </section>
          <aside className="right-rail">
            <section className="focus-invite">
              <span className="eyebrow">A LITTLE SPACE TO FOCUS</span>
              <h2>
                Turn curiosity
                <br />
                into progress.
              </h2>
              <p>Set an intention. Give it your attention.</p>
              <button className="button" onClick={() => setParams({ tab: 'pods' })}>
                Create a focus pod <ArrowUpRight size={17} />
              </button>
            </section>
            <section className="card rail-card">
              <h3>Your topics</h3>
              {topics.length ? (
                <div className="tag-list">
                  {topics.map((topic) => (
                    <button key={topic} onClick={() => setFilter(topic)}>
                      <Topic topic={topic} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">Topics will appear as you add learning posts.</p>
              )}
            </section>
            <section className="card rail-card">
              <h3>Your learning circle</h3>
              {data.accounts.length ? (
                data.accounts.slice(0, 4).map((p) => (
                  <div className="person-row" key={p.id}>
                    <Avatar id={p.id} />
                    <Avatar id={p.id} nameOnly />
                  </div>
                ))
              ) : (
                <p className="muted">No accounts added yet. Your people will appear here.</p>
              )}
              <Link to="/search" className="text-link">
                Explore your workspace <ArrowUpRight size={14} />
              </Link>
            </section>
            <p className="rail-footnote">One useful idea at a time.</p>
          </aside>
        </div>
      )}
    </>
  );
}
