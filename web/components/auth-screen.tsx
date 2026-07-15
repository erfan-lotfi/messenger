'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { login, register } from '@/lib/api';
import { setStoredAuth } from '@/lib/storage';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLogin = mode === 'login';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = isLogin
        ? await login(username, password)
        : await register(username, password);

      setStoredAuth(response);
      router.push('/chat');
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Authentication failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 24,
          borderRadius: 16,
          background: '#111827',
          border: '1px solid #374151',
          display: 'grid',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>
            {isLogin ? 'Login' : 'Create account'}
          </h1>
          <p style={{ margin: '8px 0 0', color: '#9ca3af' }}>
            Use only your username and password.
          </p>
        </div>

        <input
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={inputStyle}
        />

        {error ? (
          <div style={{ color: '#fca5a5', fontSize: 14 }}>{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
        </button>

        <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Link href={isLogin ? '/register' : '/login'} style={{ color: '#60a5fa' }}>
            {isLogin ? 'Register' : 'Login'}
          </Link>
        </p>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #374151',
  background: '#0f172a',
  color: '#f9fafb',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
};
