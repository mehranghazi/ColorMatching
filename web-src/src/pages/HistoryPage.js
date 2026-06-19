import React, { useState } from 'react';
import { useHistory } from '../context/HistoryContext';

const labToRgb = (l, a, b) => {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;
  x = x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787;
  y = y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787;
  z = z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787;
  const r = Math.max(0, Math.min(255, Math.round(x * 0.95047 * 255)));
  const g = Math.max(0, Math.min(255, Math.round(y * 255)));
  const bVal = Math.max(0, Math.min(255, Math.round(z * 1.0883 * 255)));
  return { r, g, b: bVal };
};

const swatchStyle = (session) => {
  if (session.rgb && session.rgb.R != null) {
    return { backgroundColor: `rgb(${session.rgb.R},${session.rgb.G},${session.rgb.B})` };
  }
  if (session.Lab) {
    const { r, g, b } = labToRgb(session.Lab[0], session.Lab[1], session.Lab[2]);
    return { backgroundColor: `rgb(${r},${g},${b})` };
  }
  return { backgroundColor: '#ccc' };
};

const inputLabel = (session) => {
  if (session.input_type === 'xyz' && session.xyz) {
    return `XYZ (${session.xyz.X?.toFixed(1)}, ${session.xyz.Y?.toFixed(1)}, ${session.xyz.Z?.toFixed(1)})`;
  }
  if (session.input_type === 'spectral') return 'Spectral input';
  if (session.rgb) return `RGB (${session.rgb.R}, ${session.rgb.G}, ${session.rgb.B})`;
  return 'Color match';
};

export default function HistoryPage() {
  const { sessions, loading, error, lastFetchedAt } = useHistory();
  const [selected, setSelected] = useState(null);

  if (loading) return <div className="loading">Loading history from server...</div>;
  if (error) return <div className="error">⚠ {error}</div>;
  if (!sessions.length) {
    return (
      <div className="empty">
        No match history yet — run a match on the Match tab to build your history.
        {lastFetchedAt && (
          <div style={{ fontSize: 12, marginTop: 8 }}>
            Last checked: {new Date(lastFetchedAt).toLocaleString()}
          </div>
        )}
      </div>
    );
  }

  const deColor = (de) =>
    de < 3 ? '#4CAF50' : de < 6 ? '#FF9800' : '#f44336';

  return (
    <div>
      <div className="history-header">
        <h2>Match History</h2>
        <span className="history-count">{sessions.length} records</span>
      </div>
      {sessions.map((s) => (
        <div key={s.id} className="card history-card" onClick={() => setSelected(s)}>
          <div className="history-swatch" style={swatchStyle(s)} />
          <div className="history-info">
            <div className="history-combo">{s.combination}</div>
            <div className="history-date">{new Date(s.created_at).toLocaleString()}</div>
            <div className="history-date">
              {s.method} · {s.combo_type} dyes · {s.input_type || 'rgb'}
            </div>
            <div className="history-date">{inputLabel(s)}</div>
          </div>
          <div className="history-delta">
            <div className="history-de" style={{ color: deColor(s.delta_e) }}>
              {s.delta_e?.toFixed(2) ?? '—'}
            </div>
            <div className="history-de-label">ΔE</div>
          </div>
        </div>
      ))}

      {selected && (
        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
        >
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 8 }}>{selected.combination}</h2>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
              {new Date(selected.created_at).toLocaleString()} · History record #{selected.id}
            </div>
            {selected.result?.dyes?.map((d, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{d.name}</span>
                  <span style={{ fontWeight: 700 }}>{(d.concentration * 100).toFixed(3)}% OWP</span>
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
