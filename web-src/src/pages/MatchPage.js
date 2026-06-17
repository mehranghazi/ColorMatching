import React, { useState, useRef, useEffect } from 'react';
import { matchFromXYZ, matchFromRGB, extractRGB } from '../services/api';
import GamutChart from '../components/GamutChart';
import SpectralInput from '../components/SpectralInput';
import { matchFromSpectral } from '../services/api';

const labToRgb = (l, a, b) => {
  let y = (l + 16) / 116, x = a / 500 + y, z = y - b / 200;
  x = x * x * x > 0.008856 ? x * x * x : (x - 16/116) / 7.787;
  y = y * y * y > 0.008856 ? y * y * y : (y - 16/116) / 7.787;
  z = z * z * z > 0.008856 ? z * z * z : (z - 16/116) / 7.787;
  let r = x * 0.95047 * 255, g = y * 1.0 * 255, b_val = z * 1.0883 * 255;
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b_val = Math.max(0, Math.min(255, Math.round(b_val)));
  return { r, g, b: b_val, hex: '#' + [r, g, b_val].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase() };
};

const generateColorImage = (r, g, b) => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 200, 200);
  return canvas.toDataURL();
};


export default function MatchPage() {
  const [tab,    setTab]    = useState('photo'); // 'photo' | 'xyz'
  const [X, setX] = useState('');
  const [Y, setY] = useState('');
  const [Z, setZ] = useState('');
  const [method,    setMethod]    = useState('delaunay');
  const [comboType, setComboType] = useState(3);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(null);
  const [rgb,       setRgb]       = useState(null);
  const [preview,   setPreview]   = useState(null);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError('');
    try {
      setLoading(true);
      const rgbData = await extractRGB(file);
      setRgb(rgbData);
      const res = await matchFromRGB(rgbData.R, rgbData.G, rgbData.B, method, comboType);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleXYZ = async () => {
    if (!X || !Y || !Z) { setError('Enter all XYZ values'); return; }
    setError('');
    try {
      setLoading(true);
      const res = await matchFromXYZ(parseFloat(X), parseFloat(Y), parseFloat(Z), method, comboType);
      setResult(res);
      // Display XYZ input values in a formatted way
      setRgb({ R: X, G: Y, B: Z, hex: '#XYZ', label: 'XYZ Input' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxConc = result ? Math.max(...result.dyes.map(d => d.concentration)) : 1;
  const deColor = result
    ? result.delta_e_real < 3 ? '#4CAF50'
    : result.delta_e_real < 6 ? '#FF9800' : '#f44336'
    : '#1a1a1a';

  const handleSpectral = async (values) => {
    setError('');
    try {
      setLoading(true);
      const res = await matchFromSpectral(values, method, comboType);
      setResult(res);
      // Display spectral input values summary
      setRgb({ reflectance: values.slice(0, 3).map(v => (v*100).toFixed(1)).join(', '), hex: '#Spectral', label: 'Spectral Input' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* input tabs */}
      <div className="card">
        <div className="toggle-row">
          <button className={tab === 'photo' ? 'toggle active' : 'toggle'} onClick={() => { setTab('photo'); setResult(null); setRgb(null); setError(''); }}>
            📷 Photo
          </button>
          <button className={tab === 'xyz' ? 'toggle active' : 'toggle'} onClick={() => { setTab('xyz'); setResult(null); setRgb(null); setError(''); }}>
            🔢 XYZ Values
          </button>
          <button className={tab === 'spectral' ? 'toggle active' : 'toggle'} onClick={() => { setTab('spectral'); setResult(null); setRgb(null); setError(''); }}>
            📊 Spectral
          </button>
        </div>

        {tab === 'spectral' && (
          <SpectralInput onSubmit={handleSpectral} loading={loading} />
        )}

        {tab === 'photo' && (
          <div>
            <div className="upload-area" onClick={() => fileRef.current.click()}>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} capture="environment" />
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                Click to upload photo or take a picture<br />
                <small>Center 200×200px will be analyzed</small>
              </div>
            </div>
            {preview && <img src={preview} alt="preview" className="preview-img" />}
          </div>
        )}

        {tab === 'xyz' && (
          <div>
            {['X','Y','Z'].map((label, i) => (
              <div className="input-row" key={label}>
                <label>{label}</label>
                <input
                  type="number"
                  placeholder={`Enter ${label}`}
                  value={[X,Y,Z][i]}
                  onChange={e => [setX,setY,setZ][i](e.target.value)}
                />
              </div>
            ))}
            <button className="btn" onClick={handleXYZ} disabled={loading}>
              {loading ? 'Matching...' : 'Find Match'}
            </button>
          </div>
        )}

        {/* method + combo selectors */}
        <div style={{ marginTop: 16 }}>
          <div className="section-title">Method</div>
          <div className="toggle-row">
            {['delaunay','nearest_neighbor'].map(m => (
              <button key={m} className={method===m ? 'toggle active' : 'toggle'} onClick={() => setMethod(m)}>
                {m === 'delaunay' ? 'Delaunay' : 'Nearest Neighbor'}
              </button>
            ))}
          </div>
          <div className="section-title">Number of Dyes</div>
          <div className="toggle-row">
            {[2,3].map(n => (
              <button key={n} className={comboType===n ? 'toggle active' : 'toggle'} onClick={() => setComboType(n)}>
                {n} Dyes
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error">⚠ {error}</div>}
        {loading && <div className="loading">Analyzing...</div>}
      </div>

      {/* results */}
      {result && (
        <>
          {preview && (
            <div className="card">
              <div className="section-title">Input Photo</div>
              <img src={preview} alt="preview" className="preview-img" />
            </div>
          )}

          {/* output color */}
          {result && result.query_Lab && (
            <div className="card">
              <div className="section-title">Output Color</div>
              {(() => {
                const colorRgb = labToRgb(result.query_Lab[0], result.query_Lab[1], result.query_Lab[2]);
                const colorImage = generateColorImage(colorRgb.r, colorRgb.g, colorRgb.b);
                return (
                  <div>
                    <img src={colorImage} alt="output color" style={{ width: '100%', height: 'auto', borderRadius: 8, marginBottom: 12 }} />
                    <div className="lab-text">
                      sRGB: {colorRgb.r}, {colorRgb.g}, {colorRgb.b} &nbsp;|&nbsp; {colorRgb.hex}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* combination + gamut */}
          {/* combination + gamut */}
          <div className="card">
            <h2>{result.combination_name}</h2>
            <span className="badge" style={{
              backgroundColor: result.inside_gamut ? '#4CAF50' : '#FF9800'
            }}>
              {result.inside_gamut ? '✓ Inside gamut' : '⚠ Outside gamut — nearest match'}
            </span>

            <div className="section-title">Dye Concentrations</div>
            {result.dyes.map((dye, i) => (
              <div className="dye-card" key={i}>
                <div className="dye-header">
                  <span className="dye-name">{dye.name}</span>
                  <span className="dye-conc">{(dye.concentration * 100).toFixed(3)}% OWP</span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{
                    width: `${(dye.concentration / maxConc) * 100}%`
                  }} />
                </div>
                <div className="ci-number">{dye.ci_number}</div>
              </div>
            ))}
          </div>

            {result.combination_id && (
              <GamutChart
                combinationId={result.combination_id}
                queryXY={result.query_xy}
                queryAB={result.query_ab}
  />
)}




          {/* delta E */}
          <div className="card delta-card">
            <div className="delta-label">Color Difference (ΔE)</div>
            <div className="delta-value" style={{ color: deColor }}>
              {(result.delta_e_real ?? result.delta_e ?? 0).toFixed(2)}
            </div>
            <div className="delta-hint">
              {(result.delta_e_real ?? 0) < 1 ? 'Excellent match' :
               (result.delta_e_real ?? 0) < 3 ? 'Good match' :
               (result.delta_e_real ?? 0) < 6 ? 'Acceptable match' : 'Poor match'}
            </div>
          </div>

          {/* Lab values */}
          <div className="card">
            <div className="section-title">CIE L*a*b*</div>
            <div className="lab-text">
              L* = {result.query_Lab?.[0]?.toFixed(2)}&nbsp;&nbsp;
              a* = {result.query_Lab?.[1]?.toFixed(2)}&nbsp;&nbsp;
              b* = {result.query_Lab?.[2]?.toFixed(2)}
            </div>
          </div>
        </>
      
      
      
      )}
    </div>
  );
}
