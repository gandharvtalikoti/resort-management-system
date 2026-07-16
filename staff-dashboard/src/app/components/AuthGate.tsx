'use client';

import { useState, useEffect, useCallback } from 'react';
import { login } from '@/lib/api';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const res = await login(username, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('role', res.user.role);
      setAuthenticated(true);
    } catch (err) {
      setError(true);
      setTimeout(() => {
        setPassword('');
      }, 500);
      setTimeout(() => setError(false), 2000);
    }
  }, [username, password]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && username.length > 0 && password.length > 0) {
        handleSubmit();
      }
    },
    [handleSubmit, username, password]
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-surface rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-500/20 rounded-full blur-3xl" />
      </div>

      <div
        className={`glass-panel p-10 w-full max-w-sm relative z-10 text-center ${
          error ? 'pin-shake' : ''
        }`}
      >
        <img src="/logo.png" alt="Buddha Village Logo" className="h-16 w-auto object-contain mx-auto mb-4" onError={(e) => (e.currentTarget.style.display = 'none')} />

        <p className="text-sm text-foreground-muted tracking-widest uppercase mb-8">
          Staff Access
        </p>

        <div className="space-y-4 text-left">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full font-mono bg-transparent border-b-2 border-foreground/10 focus:border-gold/60 outline-none py-3 px-4 transition-colors duration-300 placeholder:text-foreground-muted/50"
            placeholder="Username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full font-mono bg-transparent border-b-2 border-foreground/10 focus:border-gold/60 outline-none py-3 px-4 transition-colors duration-300 placeholder:text-foreground-muted/50"
            placeholder="Password"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={username.length === 0 || password.length === 0}
          className="mt-8 w-full py-3 rounded-xl bg-foreground text-background text-sm font-medium tracking-wide uppercase transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Sign In
        </button>

        <div
          className={`mt-4 text-sm text-red-400 transition-opacity duration-300 ${
            error ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Incorrect username or password.
        </div>
      </div>
    </div>
  );
}
