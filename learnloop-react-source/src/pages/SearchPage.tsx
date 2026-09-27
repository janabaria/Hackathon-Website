import { useDeferredValue } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../state/AppProvider';
import { Avatar, EmptyState, PageHeader, Topic } from '../components/ui';

export function SearchPage() {
  const { data, commit } = useApp();
  const [params] = useSearchParams();
  const query = useDeferredValue((params.get('q') ?? '').trim().toLowerCase());
  const accounts = [...(data.profile.name ? [data.profile] : []), ...data.accounts].filter((p) =>
    `${p.name} ${p.bio} ${p.interests.join(' ')}`.toLowerCase().includes(query),
  );
  const topics = [
    ...new Set(
      [...data.posts, ...data.reels, ...data.quizzes]
        .map((p) => p.topic)
        .concat(data.profile.interests),
    ),
  ].filter((t) => t.toLowerCase().includes(query));
  return (
    <>
      <PageHeader
        eyebrow="FOLLOW YOUR CURIOSITY"
        title="Find your next connection."
        description="Search your people and topics using the search bar above."
      />
      {!accounts.length && !topics.length ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title={query ? 'No matches just yet.' : 'Your world of learning will grow here.'}
            description={
              query
                ? 'Try a different name or topic.'
                : 'Add your profile, posts, or imported accounts to start exploring.'
            }
            action={
              <Link className="button secondary" to="/profile">
                Set up your profile
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <h2>Topics</h2>
          <div className="tag-list search-topics">
            {topics.length ? (
              topics.map((t) => <Topic topic={t} key={t} />)
            ) : (
              <p className="muted">No matching topics.</p>
            )}
          </div>
          <h2>People</h2>
          <div className="card-grid search-results">
            {accounts.map((person) => (
              <article className="card person-row" key={person.id}>
                <Avatar id={person.id} />
                <div>
                  <Avatar id={person.id} nameOnly />
                  <p className="muted">{person.bio || 'No bio yet'}</p>
                </div>
                {person.id !== data.profile.id && (
                  <button
                    className="chip"
                    onClick={() => commit({ type: 'account/follow', id: person.id })}
                  >
                    {data.following.includes(person.id) ? 'Following' : 'Follow'}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
