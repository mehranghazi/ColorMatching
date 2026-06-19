import React, { useState } from 'react';
import MatchPage from './pages/MatchPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HistoryProvider, useHistory } from './context/HistoryContext';
import './App.css';

function AppContent() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const { fetchHistory, clearHistory } = useHistory();
  const [page, setPage] = useState('match');
  const [authPage, setAuthPage] = useState('login');

  const handleTabChange = (tab) => {
    console.log('[App] Switching tab:', tab);
    setPage(tab);
    if (tab === 'history') {
      fetchHistory(50);
    }
  };

  const handleLogout = () => {
    logout();
    clearHistory();
    setPage('match');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return authPage === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthPage('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <span className="navbar-brand">🎨 Color Matching</span>
        <div className="nav-links">
          <button
            className={page === 'match' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabChange('match')}
          >
            Match
          </button>
          <button
            className={page === 'history' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabChange('history')}
          >
            History
          </button>
          <span className="nav-user">{user.name}</span>
          <button className="nav-btn logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
      <main className="main">
        {page === 'match' && <MatchPage />}
        {page === 'history' && <HistoryPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HistoryProvider>
        <AppContent />
      </HistoryProvider>
    </AuthProvider>
  );
}
