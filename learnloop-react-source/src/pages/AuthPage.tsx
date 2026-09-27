import { useState, type FormEvent } from 'react';
import { supabase } from '../services/supabase';
import { communityError } from '../services/community';
import { PageHeader } from '../components/ui';
export function AuthForm() {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = signup
        ? await supabase!.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: window.location.origin + window.location.pathname },
          })
        : await supabase!.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (signup && !result.data.session)
        setMessage('Check your email to confirm your account, then return here to sign in.');
      setPassword('');
    } catch (err) {
      setMessage(communityError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="LEARNLOOP COMMUNITY"
        title={signup ? 'Start learning together.' : 'Welcome back.'}
        description="Sign in to share posts and access your profile across devices."
      />
      <section className="card settings-card" style={{ maxWidth: 520 }}>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={signup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && <p role="status">{message}</p>}
          <button className="button primary" disabled={busy}>
            {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
          </button>
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setSignup(!signup);
              setMessage('');
            }}
          >
            {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
        </form>
      </section>
      <p className="muted">
        Your posts, learning tools, and private progress sync to your account.
      </p>
    </>
  );
}
