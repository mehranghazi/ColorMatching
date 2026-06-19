import React, { createContext, useCallback, useContext, useState } from 'react';
import { getHistory } from '../services/api';

const HistoryContext = createContext(null);

export function HistoryProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchHistory = useCallback(async (limit = 50) => {
    const endpoint = `/match/history?limit=${limit}`;
    console.log('[History] Fetching from GET', endpoint);
    setLoading(true);
    setError('');
    try {
      const data = await getHistory(limit);
      console.log(
        '[History] Loaded',
        data.length,
        'history records from',
        endpoint,
        '— dataset:',
        data.map((s) => ({ id: s.id, combination: s.combination, input_type: s.input_type, created_at: s.created_at }))
      );
      setSessions(data);
      setLastFetchedAt(new Date().toISOString());
      return data;
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Failed to load history';
      console.error('[History] Failed to load from', endpoint, ':', message);
      setError(message);
      setSessions([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    console.log('[History] Clearing local history state');
    setSessions([]);
    setLastFetchedAt(null);
    setError('');
  }, []);

  return (
    <HistoryContext.Provider value={{ sessions, loading, error, lastFetchedAt, fetchHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}
