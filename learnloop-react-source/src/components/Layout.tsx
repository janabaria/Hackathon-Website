import {
  BookOpen,
  CircleUserRound,
  Compass,
  Gamepad2,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Video,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from '../state/AppProvider';
import { Avatar } from './ui';

const navigation = [
  { to: '/', label: 'Home', icon: Compass },
  { to: '/reels', label: 'Reels', icon: Video },
  { to: '/interact', label: 'Interact', icon: Gamepad2 },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/profile', label: 'Profile', icon: CircleUserRound },
];

export function Layout({ children, onCreate }: { children: ReactNode; onCreate: () => void }) {
  const { data, notice, recoveryError } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q') ?? '';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span>
            <BookOpen size={22} />
          </span>
          LearnLoop<i>·</i>
        </Link>
        <p className="brand-tagline">Make room for a new idea.</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={21} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="button primary sidebar-create" onClick={onCreate}>
          <Plus size={18} />
          Create post
        </button>
        <div className="sidebar-footer">
          <div className="learning-note">
            <Sparkles size={20} />
            <strong>A space to grow.</strong>
            <p>
              Discover. Focus. Practice.
              <br />
              Share what clicks.
            </p>
          </div>
          <Link className="settings-link" to="/settings">
            <Settings2 size={18} />
            Workspace settings
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <Link className="mobile-brand" to="/">
            <BookOpen size={22} />
            <strong>LearnLoop</strong>
          </Link>
          <label className="search-input">
            <Search size={18} />
            <input
              aria-label="Search people and topics"
              placeholder="Follow your curiosity…"
              value={query}
              onChange={(event) =>
                navigate(`/search?q=${encodeURIComponent(event.target.value)}`, {
                  replace: location.pathname === '/search',
                })
              }
            />
          </label>
          <div className="topbar-right">
            <span className="local-badge">Your learning workspace</span>
            <Avatar id={data.profile.id} />
          </div>
        </header>
        <main id="main" className="main-content">
          {recoveryError && (
            <div className="error-banner" role="alert">
              {recoveryError} <Link to="/settings">Open Settings</Link>
            </div>
          )}
          {children}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
