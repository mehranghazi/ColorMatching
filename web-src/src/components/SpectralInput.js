import React, { useState, useRef } from 'react';

const WAVELENGTHS = Array.from({ length: 31 }, (_, i) => 400 + i * 10);

export default function SpectralInput({ onSubmit, loading }) {
  const [mode, setMode] = useState('text'); // 'text' | 'file'
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef();

  const parseAndSubmit = (values) => {
    if (values.length !== 31) {
      setError(`Expected 31 values, got ${values.length}`);
      return;
    }
    if (values.some(v => isNaN(v) || v < 0 || v > 1)) {
      setError('All values must be numbers between 0 and 1');
      return;
    }
    setError('');
    onSubmit(values);
  };

  const handleTextSubmit = () => {
    const values = text
      .split(/[,\s]+/)
      .filter(s => s.length > 0)
      .map(Number);
    parseAndSubmit(values);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      // support CSV (comma) or plain text (newline/comma/space separated)
      const values = content
        .split(/[,\n\r\s]+/)
        .filter(s => s.length > 0)
        .map(Number);
      parseAndSubmit(values);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="toggle-row">
        <button className={mode === 'text' ? 'toggle active' : 'toggle'} onClick={() => setMode('text')}>
          Type values
        </button>
        <button className={mode === 'file' ? 'toggle active' : 'toggle'} onClick={() => setMode('file')}>
          Upload file
        </button>
      </div>

      {mode === 'text' && (
        <div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
            Enter 31 reflectance values (400–700nm, 10nm steps), comma or space separated
          </div>
          <textarea
            rows={4}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px solid #eee', fontSize: 13, fontFamily: 'monospace' }}
            placeholder="0.12, 0.15, 0.18, 0.21, ..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button className="btn" style={{ marginTop: 12 }} onClick={handleTextSubmit} disabled={loading}>
            {loading ? 'Matching...' : 'Match Spectral Curve'}
          </button>
        </div>
      )}

      {mode === 'file' && (
        <div>
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            <input
              type="file"
              accept=".csv,.txt"
              ref={fileRef}
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <div className="upload-icon">📄</div>
            <div className="upload-text">
              Click to upload CSV or TXT file<br />
              <small>31 reflectance values (400–700nm, 10nm steps)</small>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">⚠ {error}</div>}

      <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
        Wavelengths: {WAVELENGTHS[0]}–{WAVELENGTHS[WAVELENGTHS.length-1]} nm
      </div>
    </div>
  );
}