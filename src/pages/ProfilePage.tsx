import { ReelPreview } from '../components/ReelPreview';
import { T } from '../lib/i18n';
import { InterestPicker } from '../components/InterestPicker';

import { BadgeCollection, DeleteAccount } from '../components/ProfileExtras';

import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { Bookmark, CircleUserRound, Edit3, PenLine, Settings2, Video } from 'lucide-react';

import { useApp } from '../state/AppProvider';

import { EmptyState, Modal, PageHeader, Topic } from '../components/ui';

import { PostCard } from '../components/PostCard';

import { displayName, initials, parseTags, readImage } from '../lib/utils';

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
            <T>Explore accounts</T>
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
              <T>Settings</T>
            </Link>
          ) : undefined
        }
      />

      <section className="card profile-card">
        <div className="profile-cover">
          <span>
            <T>Always a work in progress.</T>
          </span>
        </div>

        <div className="profile-body">
          <span className="avatar profile-avatar">
            {profile.avatar ? <img src={profile.avatar} alt="Profile" /> : initials(profile.name)}
          </span>

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
                <T>Edit profile</T>
              </button>
            ) : (
              <button
                className="button primary"

                onClick={async () => await commit({ type: 'account/follow', id: profile.id })}
              >
                <T>{data.following.includes(profile.id) ? 'Following' : 'Follow'}</T>
              </button>
            )}
          </div>

          <div className="stats">
            <span>
              <strong>{data.posts.filter((p) => p.authorId === profile.id).length}</strong>
              <T>Posts</T>
            </span>

            <span>
              <strong>{data.reels.filter((p) => p.authorId === profile.id).length}</strong>
              <T>Reels</T>
            </span>

            {own && (
              <>
                <span>
                  <strong>{data.completedSessions.length}</strong>
                  <T>Focus sessions</T>
                </span>

                <span>
                  <strong>{data.following.length}</strong>
                  <T>Following</T>
                </span>
              </>
            )}
          </div>

          <div className="profile-tags">
            <div>
              <h3>
                <T>Curious about</T>
              </h3>

              <div className="tag-list">
                {profile.interests.length ? (
                  profile.interests.map((t) => <Topic key={t} topic={t} />)
                ) : (
                  <small>
                    <T>No interests yet</T>
                  </small>
                )}
              </div>
            </div>

            <div>
              <h3>
                <T>Skilled at</T>
              </h3>

              <div className="tag-list">
                {profile.skills.length ? (
                  profile.skills.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))
                ) : (
                  <small>
                    <T>No skills yet</T>
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <BadgeCollection profileId={profile.id} />

      <div className="page-tabs" role="tablist" aria-label="Profile content">
        {['Posts', 'Reels', ...(own ? ['Saved'] : [])].map((label) => (
          <button
            role="tab"

            aria-selected={tab === label}

            key={label}

            onClick={() => setTab(label)}
          >
            <T>{label}</T>
          </button>
        ))}
      </div>

      <div className="profile-content">
        {tab !== 'Reels' && posts.map((post) => <PostCard key={post.id} post={post} />)}

        {tab !== 'Posts' &&
          reels.map((reel) => (
            <Link className="card reel-preview" to={`/reels?id=${reel.id}`} key={reel.id}>
              <ReelPreview reel={reel} />
              <Video size={28} />

              <Topic topic={reel.topic} />

              <h2>{reel.title}</h2>

              <p>{reel.caption}</p>

              <span>
                <T>Open reels →</T>
              </span>
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

      {own && <DeleteAccount />}

      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
    </>
  );
}

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { data, commit, notify } = useApp();

  const [name, setName] = useState(data.profile.name);

  const [avatar, setAvatar] = useState(data.profile.avatar);
  const [imageError, setImageError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  const [bio, setBio] = useState(data.profile.bio);

  const [interests, setInterests] = useState(data.profile.interests);

  const [skills, setSkills] = useState(data.profile.skills.join(', '));

  return (
    <Modal title="Make this space yours" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          if (!interests.length) {
            notify('Choose at least one interest.');
            return;
          }

          if (
            await commit({
              type: 'profile/update',

              profile: {
                ...data.profile,

                name: name.trim(),

                bio,
                avatar,

                interests,

                skills: parseTags(skills),
              },
            })
          ) {
            notify('Profile saved.');

            onClose();
          }
        }}
      >
        <div className="profile-photo-editor">
          <span className="avatar profile-avatar">
            {avatar ? <img src={avatar} alt="Profile preview" /> : initials(name)}
          </span>
          <label>
            Profile photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setReadingImage(true);
                setImageError('');
                try {
                  setAvatar(await readImage(file));
                } catch (err) {
                  setImageError((err as Error).message);
                } finally {
                  setReadingImage(false);
                  e.target.value = '';
                }
              }}
            />
            <small>PNG, JPG, WebP or GIF · up to 1 MB</small>
          </label>
          {avatar && (
            <button type="button" className="text-button" onClick={() => setAvatar('')}>
              Remove photo
            </button>
          )}
          {imageError && <p role="alert">{imageError}</p>}
        </div>
        <label>
          <T>Name</T>
          <input
            required

            maxLength={80}

            autoFocus

            value={name}

            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          <T>Bio</T>
          <textarea maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>

        <InterestPicker value={interests} onChange={setInterests} required />

        <label>
          <T>Skilled at</T>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} />
          <small>
            <T>Separate tags with commas.</T>
          </small>
        </label>

        <button className="button primary full-width" disabled={readingImage}>
          <T>Save profile</T>
        </button>
      </form>
    </Modal>
  );
}
