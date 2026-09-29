import { Brand } from '../components/Brand';
import { T } from '../lib/i18n';
import { InterestPicker } from '../components/InterestPicker';
import { useState, type FormEvent } from 'react';
import { supabase } from '../services/supabase';
import { communityError } from '../services/community';
import { PageHeader } from '../components/ui';
export function AuthForm() {
  const [interests, setInterests] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (signup && !interests.length) {
      setMessage('Choose at least one interest.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = signup
        ? await supabase!.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { interests, name: name.trim() },
              emailRedirectTo: window.location.origin + window.location.pathname,
            },
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
      <Brand className="auth-brand" />
      <PageHeader
        eyebrow="BEYOND THE BOOK COMMUNITY"
        title={signup ? 'Start learning together.' : 'Welcome back.'}
        description="Sign in to share posts and access your profile across devices."
      />
      <section className="card settings-card" style={{ maxWidth: 520 }}>
        <form onSubmit={submit}>
          {signup && (
            <>
              <label>
                <T>Name</T>
                <input
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <InterestPicker value={interests} onChange={setInterests} required />
            </>
          )}
          <label>
            <T>Email</T>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <T>Password</T>
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
            <T>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</T>
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
            <T>{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</T>
          </button>
        </form>
      </section>
      <p className="muted">
        <T>Your posts, learning tools, and private progress sync to your account.</T>
      </p>
    </>
  );
}
