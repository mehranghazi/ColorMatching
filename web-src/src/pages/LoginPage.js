import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onSwitchToRegister }) {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      setMessage(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>Login</h2>
        <p className="auth-subtitle">Sign in to access color matching and your history.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
          </div>
          {(authError || message) && (
            <div className={authError ? 'error' : 'success'}>
              {authError || message}
            </div>
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <button type="button" className="link-btn" onClick={onSwitchToRegister}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
