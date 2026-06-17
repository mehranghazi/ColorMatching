import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

export const matchFromRGB = (R, G, B, method='delaunay', comboType=3) =>
  api.post('/match/rgb', { R, G, B, method, combo_type: comboType }).then(r => r.data);

export const matchFromXYZ = (X, Y, Z, method='delaunay', comboType=3) =>
  api.post('/match/xyz', { X, Y, Z, method, combo_type: comboType }).then(r => r.data);

export const extractRGB = async (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/match/extract-rgb', form).then(r => r.data);
};

export const getHistory = (limit=20) =>
  api.get(`/match/history?limit=${limit}`).then(r => r.data);

export const getHealth = () =>
  api.get('/health').then(r => r.data);

export const getGamut = (combinationId, space = 'xy') =>
  api.get(`/match/gamut/${combinationId}?space=${space}`).then(r => r.data);

export const matchFromSpectral = (reflectance, method='delaunay', comboType=3) =>
  api.post('/match/spectral', { reflectance, method, combo_type: comboType }).then(r => r.data);
