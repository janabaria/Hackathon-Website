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
  Info,
  Users,
  FileText,
  Video,
  UserRound,
} from 'lucide-react';

import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useState, type ReactNode } from 'react';
import { Modal } from './ui';

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
  const [creating, setCreating] = useState(false);
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

        <button className="button primary sidebar-create" onClick={() => setCreating(true)}>
          <Plus size={18} />
          <T>Create</T>
        </button>
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
            <button
              className="icon-button mobile-create"
              aria-label="Create"
              onClick={() => setCreating(true)}
            >
              <Plus size={20} />
            </button>
            <NavLink to="/calendar" className="icon-button" aria-label="Calendar" title="Calendar">
              <CalendarDays size={20} />
            </NavLink>
            <NavLink to="/about" className="icon-button" aria-label="About us" title="About us">
              <Info size={20} />
            </NavLink>
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

      {creating && (
        <Modal title="What will you create?" onClose={() => setCreating(false)}>
          <p className="muted">One small idea can start something good.</p>
          <div className="create-menu">
            {[
              {
                title: 'Create post',
                description: 'Share a discovery with your community.',
                Icon: FileText,
                action: () => onCreate(),
              },
              {
                title: 'Create reel',
                description: 'Teach something in a minute.',
                Icon: Video,
                action: () => navigate('/reels?create=1'),
              },
              {
                title: 'Create pod',
                description: 'Make space to learn together.',
                Icon: Users,
                action: () => navigate('/?tab=pods&create=1'),
              },
            ].map(({ title, description, Icon, action }, i) => (
              <button
                key={title}
                style={{ animationDelay: `${i * 55}ms` }}
                onClick={() => {
                  setCreating(false);
                  action();
                }}
              >
                <span>
                  <Icon size={24} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </div>
                <Plus size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
