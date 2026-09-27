import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, CircleUserRound, Edit3, PenLine, Settings2, Video } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { EmptyState, Modal, PageHeader, Topic } from '../components/ui';
import { PostCard } from '../components/PostCard';
import { displayName, initials, parseTags } from '../lib/utils';

export function ProfilePage() {
  const { id } = useParams();
  const { data, commit } = useApp();
  const profile = [data.profile, ...data.accounts].find((p) => p.id === (id ?? data.profile.id));
  const [tab, setTab] = useState('Posts');
  const [editing, setEditing] = useState(false);
  if (!profile)
    return (
      <EmptyState
        icon={CircleUserRound}
        title="Profile not found"
        description="This account is not in your workspace."
        action={
          <Link to="/search" className="button primary">
            Explore accounts
          </Link>
        }
      />
    );
  const own = profile.id === data.profile.id;
  const posts = data.posts.filter((p) => (tab === 'Saved' ? p.saved : p.authorId === profile.id));
  const reels = data.reels.filter((r) => (tab === 'Saved' ? r.saved : r.authorId === profile.id));
  return (
    <>
      <PageHeader
        eyebrow="YOUR LEARNING IDENTITY"
        title={own ? 'A little more you.' : displayName(profile.name)}
        description={
          own
            ? 'The things you’re learning, and the things you can share.'
            : 'Explore this learner’s contributions.'
        }
        action={
          own ? (
            <Link className="button secondary" to="/settings">
              <Settings2 size={17} />
              Settings
            </Link>
          ) : undefined
        }
      />
      <section className="card profile-card">
        <div className="profile-cover">
          <span>Always a work in progress.</span>
        </div>
        <div className="profile-body">
          <span className="avatar profile-avatar">{initials(profile.name)}</span>
          <div className="profile-heading">
            <div>
              <h1>{profile.name || 'Make this space yours.'}</h1>
              <p className="muted">
                {profile.bio ||
                  (own
                    ? 'Add your name, interests, and what you’re learning.'
                    : 'No bio added yet.')}
              </p>
            </div>
            {own ? (
              <button className="button secondary" onClick={() => setEditing(true)}>
                <Edit3 size={16} />
                Edit profile
              </button>
            ) : (
              <button
                className="button primary"
                onClick={() => commit({ type: 'account/follow', id: profile.id })}
              >
                {data.following.includes(profile.id) ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div className="stats">
            <span>
              <strong>{data.posts.filter((p) => p.authorId === profile.id).length}</strong>Posts
            </span>
            <span>
              <strong>{data.reels.filter((p) => p.authorId === profile.id).length}</strong>Reels
            </span>
            {own && (
              <>
                <span>
                  <strong>{data.completedSessions.length}</strong>Focus sessions
                </span>
                <span>
                  <strong>{data.following.length}</strong>Following
                </span>
              </>
            )}
          </div>
          <div className="profile-tags">
            <div>
              <h3>Curious about</h3>
              <div className="tag-list">
                {profile.interests.length ? (
                  profile.interests.map((t) => <Topic key={t} topic={t} />)
                ) : (
                  <small>No interests yet</small>
                )}
              </div>
            </div>
            <div>
              <h3>Skilled at</h3>
              <div className="tag-list">
                {profile.skills.length ? (
                  profile.skills.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))
                ) : (
                  <small>No skills yet</small>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {own && (
        <Link to="/studio" className="studio-invite">
          <span className="tile-icon">
            <PenLine size={21} />
          </span>
          <div>
            <h3>Creator studio</h3>
            <p>Understand it better by explaining it simply.</p>
          </div>
          <span>↗</span>
        </Link>
      )}
      <div className="page-tabs" role="tablist" aria-label="Profile content">
        {['Posts', 'Reels', ...(own ? ['Saved'] : [])].map((label) => (
          <button
            role="tab"
            aria-selected={tab === label}
            key={label}
            onClick={() => setTab(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="profile-content">
        {tab !== 'Reels' && posts.map((post) => <PostCard key={post.id} post={post} />)}
        {tab !== 'Posts' &&
          reels.map((reel) => (
            <Link className="card reel-preview" to="/reels" key={reel.id}>
              <Video size={28} />
              <Topic topic={reel.topic} />
              <h2>{reel.title}</h2>
              <p>{reel.caption}</p>
              <span>Open reels →</span>
            </Link>
          ))}
      </div>
      {((tab === 'Posts' && !posts.length) ||
        (tab === 'Reels' && !reels.length) ||
        (tab === 'Saved' && !posts.length && !reels.length)) && (
        <EmptyState
          icon={tab === 'Saved' ? Bookmark : PenLine}
          title={tab === 'Saved' ? 'Keep the ideas that click.' : 'Room for your next discovery.'}
          description={
            tab === 'Saved'
              ? 'Saved posts and reels will appear here.'
              : 'Content will appear here when it’s added.'
          }
        />
      )}
      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
    </>
  );
}
function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { data, commit, notify } = useApp();
  const [name, setName] = useState(data.profile.name);
  const [bio, setBio] = useState(data.profile.bio);
  const [interests, setInterests] = useState(data.profile.interests.join(', '));
  const [skills, setSkills] = useState(data.profile.skills.join(', '));
  return (
    <Modal title="Make this space yours" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            commit({
              type: 'profile/update',
              profile: {
                ...data.profile,
                name: name.trim(),
                bio,
                interests: parseTags(interests),
                skills: parseTags(skills),
              },
            })
          ) {
            notify('Profile saved.');
            onClose();
          }
        }}
      >
        <label>
          Name
          <input
            required
            maxLength={80}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Bio
          <textarea maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <label>
          Interests
          <input value={interests} onChange={(e) => setInterests(e.target.value)} />
          <small>Separate tags with commas.</small>
        </label>
        <label>
          Skilled at
          <input value={skills} onChange={(e) => setSkills(e.target.value)} />
          <small>Separate tags with commas.</small>
        </label>
        <button className="button primary full-width">Save profile</button>
      </form>
    </Modal>
  );
}
