import { AdminPage } from '../pages/AdminPage';
import { T } from '../lib/i18n';
import { LearningGamePage } from '../pages/LearningGamePage';
import { NotebooksPage, NotebookPage } from '../pages/NotebooksPage';
import { CalendarPage } from '../pages/CalendarPage';
import { useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/ui';
import { PostComposer } from '../components/PostComposer';
import { HomePage } from '../pages/HomePage';
import { ReelsPage } from '../pages/ReelsPage';
import { InteractPage } from '../pages/InteractPage';
import { QuizPage } from '../pages/QuizPage';
import { FocusPage } from '../pages/FocusPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SearchPage } from '../pages/SearchPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StudioPage } from '../pages/StudioPage';
import { AuthForm } from '../pages/AuthPage';
import { useApp } from '../state/AppProvider';
export function App() {
  const [composing, setComposing] = useState(false);
  const location = useLocation();
  const { cloud, checking, userId, loading, pending, refresh, signOut, recoveryError } = useApp();
  if (cloud && checking)
    return (
      <main className="main-content">
        <p role="status">
          <T>Restoring your session…</T>
        </p>
      </main>
    );
  if (cloud && !userId)
    return (
      <main className="main-content">
        <AuthForm />
      </main>
    );
  return (
    <Layout onCreate={() => setComposing(true)}>
      {cloud && (
        <div className="button-row account-session-bar">
          <span>
            <T>Connected to your account</T>
          </span>
          <button
            className="button secondary"
            disabled={loading || pending}
            onClick={() => void refresh()}
          >
            <T>Refresh</T>
          </button>
          <button className="text-button" disabled={pending} onClick={() => void signOut()}>
            <T>Sign out</T>
          </button>
        </div>
      )}
      {cloud && recoveryError ? (
        <p role="alert">
          Install the new database migration, then click Refresh. Your existing posts are safe.
        </p>
      ) : loading && cloud ? (
        <p role="status">
          <T>Loading your learning space…</T>
        </p>
      ) : (
        <>
          {pending && (
            <p role="status">
              <T>Saving to Supabase…</T>
            </p>
          )}
          <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="page-enter" key={location.pathname}>
              <Routes>
                <Route path="/community" element={<Navigate to="/" replace />} />
                <Route path="/" element={<HomePage onCreate={() => setComposing(true)} />} />
                <Route path="/notebooks" element={<NotebooksPage />} />
                <Route path="/notebooks/:id" element={<NotebookPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/reels" element={<ReelsPage />} />
                <Route path="/interact" element={<InteractPage />} />
                <Route path="/game/:id" element={<LearningGamePage />} />
                <Route path="/quiz/:id" element={<QuizPage />} />
                <Route path="/focus/:id" element={<FocusPage />} />
                <Route path="/profile/:id?" element={<ProfilePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/studio" element={<StudioPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="*"
                  element={
                    <EmptyState
                      icon={Compass}
                      title="Let’s find your way back."
                      description="This page does not exist."
                      action={
                        <Link className="button primary" to="/">
                          <T>Go home</T>
                        </Link>
                      }
                    />
                  }
                />
              </Routes>
            </div>
            {composing && <PostComposer onClose={() => setComposing(false)} />}
          </fieldset>
        </>
      )}
    </Layout>
  );
}
