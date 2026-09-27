import { useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
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

export function App() {
  const [composing, setComposing] = useState(false);
  const location = useLocation();
  return (
    <Layout onCreate={() => setComposing(true)}>
      <div className="page-enter" key={location.pathname}>
        <Routes>
          <Route path="/" element={<HomePage onCreate={() => setComposing(true)} />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/interact" element={<InteractPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/focus/:id" element={<FocusPage />} />
          <Route path="/profile/:id?" element={<ProfilePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/studio" element={<StudioPage />} />
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
                    Go home
                  </Link>
                }
              />
            }
          />
        </Routes>
      </div>
      {composing && <PostComposer onClose={() => setComposing(false)} />}
    </Layout>
  );
}
