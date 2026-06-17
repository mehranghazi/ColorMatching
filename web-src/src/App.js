import React, { useState } from 'react';
import MatchPage   from './pages/MatchPage';
import HistoryPage from './pages/HistoryPage';
import './App.css';

export default function App() {
  const [page, setPage] = useState('match');

  return (
    <div className="app">
      <nav className="navbar">
        <span className="navbar-brand">🎨 Color Matching</span>
        <div className="nav-links">
          <button
            className={page === 'match'   ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('match')}
          >Match</button>
          <button
            className={page === 'history' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('history')}
          >History</button>
        </div>
      </nav>
      <main className="main">
        {page === 'match'   && <MatchPage />}
        {page === 'history' && <HistoryPage />}
      </main>
    </div>
  );
}