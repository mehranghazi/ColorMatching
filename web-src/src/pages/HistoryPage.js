import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/api';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getHistory(50)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading history...</div>;
  if (!sessions.length) return <div className="empty">No matches yet — go match some colors!</div>;

  const deColor = (de) =>
    de < 3 ? '#4CAF50' : de < 6 ? '#FF9800' : '#f44336';

  return (
    <div>
      {sessions.map(s => (
        <div key={s.id} className="card history-card" onClick={() => setSelected(s)}>
          <div
            className="history-swatch"
            style={{ backgroundColor: s.rgb ? `rgb(${s.rgb.R},${s.rgb.G},${s.rgb.B})` : '#ccc' }}
          />
          <div className="history-info">
            <div className="history-combo">{s.combination}</div>
            <div className="history-date">{new Date(s.created_at).toLocaleString()}</div>
            <div className="history-date">{s.method} · {s.combo_type} dyes</div>
          </div>
          <div className="history-delta">
            <div className="history-de" style={{ color: deColor(s.delta_e) }}>
              {s.delta_e?.toFixed(2) ?? '—'}
            </div>
            <div className="history-de-label">ΔE</div>
          </div>
        </div>
      ))}

      {/* detail modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, zIndex: 1000
        }} onClick={() => setSelected(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 480 }}
               onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 8 }}>{selected.combination}</h2>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
              {new Date(selected.created_at).toLocaleString()}
            </div>
            {selected.result?.dyes?.map((d, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{d.name}</span>
                  <span style={{ fontWeight: 700 }}>{(d.concentration*100).toFixed(3)}% OWP</span>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: deColor(selected.delta_e) }}>
                {selected.delta_e?.toFixed(2)}
              </div>
              <div style={{ color: '#666', fontSize: 12 }}>ΔE</div>
            </div>
            <button className="btn" style={{ marginTop: 16 }} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}