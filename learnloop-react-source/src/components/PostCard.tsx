import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post } from '../domain/schema';
import { Avatar, Topic } from './ui';
import { ContentActions } from './ContentActions';

export function PostCard({ post }: { post: Post }) {
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
      <ContentActions content={post} />
      <footer className="post-footer">
        <span>Take this idea a little further.</span>
        <Link to={`/?tab=pods&goal=${encodeURIComponent(post.caption)}`}>
          Study this <ArrowUpRight size={15} />
        </Link>
      </footer>
    </article>
  );
}
