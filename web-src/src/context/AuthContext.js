import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMe, login as apiLogin, register as apiRegister } from '../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const persistSession = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setError('');
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError('');
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((profile) => {
        setUser(profile);
        console.log('[Auth] Session restored for', profile.email);
      })
      .catch(() => {
        console.warn('[Auth] Stored token invalid — clearing session');
        clearSession();
      })
      .finally(() => setLoading(false));
  }, [token, clearSession]);

  const login = async (email, password) => {
    setError('');
    try {
      const data = await apiLogin(email, password);
      persistSession(data.token, data.user);
      console.log('[Auth] Login successful for', data.user.email);
      return { success: true, message: data.message };
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Login failed';
      setError(message);
      return { success: false, message };
    }
  };

  const register = async (name, email, password) => {
    setError('');
    try {
      const data = await apiRegister(name, email, password);
      persistSession(data.token, data.user);
      console.log('[Auth] Registration successful for', data.user.email);
      return { success: true, message: data.message };
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    console.log('[Auth] User logged out');
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
