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
            })}
          </small>
        </div>
        <Topic topic={post.topic} />
      </header>
      <p className="post-caption">{post.caption}</p>
      {post.image && (
        <img
          className="post-image"
          src={post.image}
          alt={`Image shared about ${post.topic}`}
          loading="lazy"
        />
      )}
      {post.videoUrl && <PostVideo url={post.videoUrl} thumbnail={post.thumbnail} />}
      <ContentActions content={post} />
      <PostReview postId={post.id} />
      {post.authorId === data.profile.id && (
        <DeleteButton label="post" action={{ type: 'content/delete', id: post.id }} />
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
