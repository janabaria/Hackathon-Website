import { useAdminAccess } from '../hooks/useAdminAccess';
import { Brand } from './Brand';
import { useT } from '../lib/i18n';
import { T } from '../lib/i18n';
import { ReminderBell } from './ReminderBell';

import {
  BookOpen,
  CalendarDays,
  Compass,
  Gamepad2,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Video,
  UserRound,
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

  { to: '/notebooks', label: 'Notebooks', icon: BookOpen },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export function Layout({ children, onCreate }: { children: ReactNode; onCreate: () => void }) {
  const t = useT();
  const admin = useAdminAccess();
  const { data, notice, recoveryError } = useApp();

  const navigate = useNavigate();

  const location = useLocation();

  const query = new URLSearchParams(location.search).get('q') ?? '';

  return (
    <div className={`app-shell ${location.pathname === '/reels' ? 'reels-route' : ''}`}>
      <aside className="sidebar">
        <Brand className="desktop-brand" />

        <p className="brand-tagline">
          <T>Make room for a new idea.</T>
        </p>

        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}

              to={to}

              end={to === '/'}

              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={21} />

              <span>{t(label)}</span>
            </NavLink>
          ))}
          {admin && (
            <NavLink to="/admin" className="nav-link admin-nav">
              Administration
            </NavLink>
          )}
        </nav>

        <button className="button primary sidebar-create" onClick={onCreate}>
          <Plus size={18} />
          <T>Create post</T>
        </button>

        <div className="sidebar-footer">
          <div className="learning-note">
            <Sparkles size={20} />

            <strong>
              <T>A space to grow.</T>
            </strong>

            <p>
              <T>Discover. Focus. Practice.</T>
              <br />
              <T>Share what clicks.</T>
            </p>
          </div>

          <Link className="settings-link" to="/calendar">
            <CalendarDays size={18} />
            <T>Exam calendar</T>
          </Link>
          <Link className="settings-link" to="/settings">
            <Settings2 size={18} />
            <T>Workspace settings</T>
          </Link>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <Brand className="mobile-brand" />

          <label className="search-input">
            <Search size={18} />

            <input
              aria-label={t('Search profiles, posts and reels')}

              placeholder={t('Follow your curiosity…')}

              value={query}

              onChange={(event) =>
                navigate(`/search?q=${encodeURIComponent(event.target.value)}`, {
                  replace: location.pathname === '/search',
                })
              }
            />
          </label>

          <div className="topbar-right">
            <Link to="/settings" className="icon-button topbar-settings" aria-label={t('Settings')}>
              <Settings2 size={20} />
            </Link>
            <ReminderBell />

            <Avatar id={data.profile.id} />
          </div>
        </header>

        <main id="main" className="main-content">
          {recoveryError && (
            <div className="error-banner" role="alert">
              {recoveryError}{' '}
              <Link to="/settings">
                <T>Open Settings</T>
              </Link>
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
