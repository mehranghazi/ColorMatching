import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '';
const TOKEN_KEY = 'auth_token';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password }).then((r) => r.data);

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const getMe = () =>
  api.get('/auth/me').then((r) => r.data);

export const matchFromRGB = (R, G, B, method = 'delaunay', comboType = 3) => {
  console.log('[Match] POST /match/rgb', { R, G, B, method, combo_type: comboType });
  return api.post('/match/rgb', { R, G, B, method, combo_type: comboType }).then((r) => {
    console.log('[Match] Response from /match/rgb:', r.data);
    return r.data;
  });
};

export const matchFromXYZ = (X, Y, Z, method = 'delaunay', comboType = 3) => {
  console.log('[Match] POST /match/xyz', { X, Y, Z, method, combo_type: comboType });
  return api.post('/match/xyz', { X, Y, Z, method, combo_type: comboType }).then((r) => {
    console.log('[Match] Response from /match/xyz:', r.data);
    return r.data;
  });
};

export const extractRGB = async (file) => {
  const form = new FormData();
  form.append('file', file);
  console.log('[Match] POST /match/extract-rgb');
  return api.post('/match/extract-rgb', form).then((r) => r.data);
};

export const getHistory = (limit = 20) =>
  api.get(`/match/history?limit=${limit}`).then((r) => r.data);

export const getHealth = () =>
  api.get('/health').then((r) => r.data);

export const getGamut = (combinationId, space = 'xy') =>
  api.get(`/match/gamut/${combinationId}?space=${space}`).then((r) => r.data);

export const matchFromSpectral = (reflectance, method = 'delaunay', comboType = 3) => {
  console.log('[Match] POST /match/spectral', { method, combo_type: comboType });
  return api.post('/match/spectral', { reflectance, method, combo_type: comboType }).then((r) => {
    console.log('[Match] Response from /match/spectral:', r.data);
    return r.data;
  });
};
