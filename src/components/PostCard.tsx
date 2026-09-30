import { learningSources } from '../lib/learningSources';
import { referencePhotos } from '../lib/referencePhotos';
import { useState } from 'react';
import { EditContentButton } from '../components/EditContent';
import { PostReview } from './PostReview';
import { T } from '../lib/i18n';
import { useApp } from '../state/AppProvider';
import { DeleteButton } from './DeleteButton';
import { PostVideo } from './PostVideo';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post } from '../domain/schema';
import { Avatar, Topic } from './ui';
import { ContentActions } from './ContentActions';
export function PostCard({ post }: { post: Post }) {
  const { data } = useApp();
  const photo = referencePhotos[post.image];
  const [failedImage, setFailedImage] = useState('');
  return (
    <article className="card post-card">
      <header className="post-header">
        <Avatar id={post.authorId} />
        <div>
          <Avatar id={post.authorId} nameOnly />
          <small>
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </small>
        </div>
        <Topic topic={post.topic} />
      </header>
      <p className="post-caption">{post.caption}</p>
      {learningSources[post.id] && (
        <a
          className="photo-credit"
          href={learningSources[post.id].url}
          target="_blank"
          rel="noreferrer"
        >
          Learning source: {learningSources[post.id].label} ↗
        </a>
      )}
      {post.image && failedImage !== post.image && (
        <img
          className="post-image"
          src={post.image}
          alt={photo?.alt ?? `Image shared about ${post.topic}`}
          loading="lazy"
          onError={() => setFailedImage(post.image)}
        />
      )}
      {failedImage === post.image && post.image && (
        <p className="muted" role="status">
          Image unavailable. The learning notes are still here.
        </p>
      )}
      {photo && (
        <>
          <small className="photo-credit">
            Reference photo by{' '}
            <a href={photo.source} target="_blank" rel="noreferrer">
              {photo.credit}
            </a>{' '}
            ·{' '}
            <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
              {photo.license}
            </a>{' '}
            · Unmodified
          </small>
          <aside className="discussion-prompt">
            <strong>Discussion starter</strong>
            <p>{photo.prompt}</p>
            <small>Share your experience in Discussions below.</small>
          </aside>
        </>
      )}
      {post.videoUrl && <PostVideo url={post.videoUrl} thumbnail={post.thumbnail} />}
      <ContentActions content={post} />
      <PostReview postId={post.id} />
      {post.authorId === data.profile.id && (
        <div className="button-row">
          <EditContentButton content={post} />
          <DeleteButton label="post" action={{ type: 'content/delete', id: post.id }} />
        </div>
      )}
      <footer className="post-footer">
        <span>
          <T>Take this idea a little further.</T>
        </span>
        <Link to={`/?tab=pods&goal=${encodeURIComponent(post.caption)}`}>
          <T>Start a focus pod</T>
          <ArrowUpRight size={15} />
        </Link>
      </footer>
    </article>
  );
}
