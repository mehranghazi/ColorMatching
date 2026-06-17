import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { getGamut } from '../services/api';

const SPECTRUM_LOCUS = [
  {x:0.1741,y:0.0050},{x:0.1740,y:0.0050},{x:0.1738,y:0.0049},{x:0.1736,y:0.0049},
  {x:0.1733,y:0.0048},{x:0.1730,y:0.0048},{x:0.1726,y:0.0048},{x:0.1721,y:0.0048},
  {x:0.1714,y:0.0051},{x:0.1703,y:0.0058},{x:0.1689,y:0.0069},{x:0.1669,y:0.0086},
  {x:0.1644,y:0.0109},{x:0.1611,y:0.0138},{x:0.1566,y:0.0177},{x:0.1510,y:0.0227},
  {x:0.1440,y:0.0297},{x:0.1355,y:0.0399},{x:0.1241,y:0.0578},{x:0.1096,y:0.0868},
  {x:0.0913,y:0.1327},{x:0.0687,y:0.2007},{x:0.0454,y:0.2950},{x:0.0235,y:0.4127},
  {x:0.0082,y:0.5384},{x:0.0039,y:0.6548},{x:0.0139,y:0.7502},{x:0.0389,y:0.8120},
  {x:0.0743,y:0.8338},{x:0.1142,y:0.8262},{x:0.1547,y:0.8059},{x:0.1929,y:0.7816},
  {x:0.2296,y:0.7543},{x:0.2658,y:0.7243},{x:0.3016,y:0.6923},{x:0.3373,y:0.6589},
  {x:0.3731,y:0.6245},{x:0.4087,y:0.5896},{x:0.4441,y:0.5547},{x:0.4788,y:0.5202},
  {x:0.5125,y:0.4866},{x:0.5448,y:0.4544},{x:0.5752,y:0.4242},{x:0.6029,y:0.3965},
  {x:0.6270,y:0.3725},{x:0.6482,y:0.3514},{x:0.6658,y:0.3340},{x:0.6801,y:0.3197},
  {x:0.6915,y:0.3083},{x:0.7006,y:0.2993},{x:0.7079,y:0.2920},{x:0.7140,y:0.2859},
  {x:0.7190,y:0.2809},{x:0.7230,y:0.2770},{x:0.7260,y:0.2740},{x:0.7283,y:0.2717},
  {x:0.7300,y:0.2700},{x:0.7311,y:0.2689},{x:0.7320,y:0.2680},{x:0.7327,y:0.2673},
  {x:0.7334,y:0.2666},{x:0.7340,y:0.2660},{x:0.7344,y:0.2656},{x:0.7346,y:0.2654},
];

const LINE_OF_PURPLES = [
  SPECTRUM_LOCUS[0],
  SPECTRUM_LOCUS[SPECTRUM_LOCUS.length - 1]
];

export default function GamutChart({ combinationId, queryXY, queryAB }) {
  const [space, setSpace] = useState('xy');
  const [gamutData, setGamutData] = useState(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!combinationId) return;
    getGamut(combinationId, space).then(setGamutData).catch(console.error);
  }, [combinationId, space]);

  useEffect(() => {
    if (!gamutData || !canvasRef.current) return;

    const points = gamutData.points.map(p =>
      space === 'xy' ? { x: p.x, y: p.y } : { x: p.a, y: p.b }
    );

    const target = space === 'xy' ? queryXY : queryAB;
    const targetPoint = target
      ? { x: target.x ?? target.a, y: target.y ?? target.b }
      : null;

    console.log('GamutChart target point:', targetPoint, 'from prop:', target);

    if (chartRef.current) chartRef.current.destroy();

    const datasets = [
      {
        label: 'gamut',
        data: points,
        pointRadius: 2,
        backgroundColor: '#888780',
        showLine: false,
        order: 3,
      }
    ];

    if (space === 'xy') {
      datasets.push({
        label: 'spectrum locus',
        data: SPECTRUM_LOCUS,
        pointRadius: 0,
        borderColor: '#444441',
        borderWidth: 1.5,
        showLine: true,
        fill: false,
        tension: 0,
        order: 1,
      });
      datasets.push({
        label: 'line of purples',
        data: LINE_OF_PURPLES,
        pointRadius: 0,
        borderColor: '#444441',
        borderWidth: 1.5,
        borderDash: [4, 4],
        showLine: true,
        fill: false,
        order: 2,
      });
    }

    if (targetPoint) {
      datasets.push({
        label: 'sample',
        data: [targetPoint],
        pointRadius: 9,
        pointStyle: 'triangle',
        backgroundColor: '#D85A30',
        borderColor: '#4A1B0C',
        borderWidth: 2,
        order: 0,
      });
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 1,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            title: { display: true, text: space === 'xy' ? 'x' : 'a*' },
            ...(space === 'xy' ? { min: 0, max: 0.8 } : {})
          },
          y: {
            title: { display: true, text: space === 'xy' ? 'y' : 'b*' },
            ...(space === 'xy' ? { min: 0, max: 0.85 } : {})
          }
        }
      }
    });
  }, [gamutData, space, queryXY, queryAB]);

  return (
    <div className="card">
      <div className="section-title">Color Gamut</div>
      <div className="toggle-row">
        <button
          className={space === 'xy' ? 'toggle active' : 'toggle'}
          onClick={() => setSpace('xy')}
        >xy chromaticity</button>
        <button
          className={space === 'ab' ? 'toggle active' : 'toggle'}
          onClick={() => setSpace('ab')}
        >a*b* plane</button>
      </div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: 500, margin: '0 auto' }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 12, color: '#666' }}>
        <span>● Gamut points</span>
        {space === 'xy' && <span>— Spectrum locus</span>}
        {space === 'xy' && <span>┄ Line of purples</span>}
        <span style={{ color: '#D85A30' }}>▲ Your sample</span>
      </div>
    </div>
  );
}
