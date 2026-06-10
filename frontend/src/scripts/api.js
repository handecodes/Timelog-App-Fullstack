// Minimal API client for TimelogAPI
const API_BASE_URL = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_API_URL) || 'http://localhost:5002/api/v1';

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

function setAuthToken(token) {
  localStorage.setItem('auth_token', token);
}

function clearAuthToken() {
  localStorage.removeItem('auth_token');
}

async function apiFetch(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let body = null;
    try { body = JSON.parse(text); } catch { body = text; }
    const err = new Error(body?.message || `API error ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

// Auth
async function login(username, password) {
  const result = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  // AuthController returns { Token: "..." } (capital T). Accept both.
  const token = result?.token || result?.Token || result?.accessToken;
  if (token) setAuthToken(token);
  return result;
}

async function logout() {
  clearAuthToken();
  return Promise.resolve();
}

// TimeLogs
async function getTimeLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/timelogs${qs ? `?${qs}` : ''}`);
}

async function getTimeLog(id) {
  return apiFetch(`/timelogs/${id}`);
}

async function createTimeLog(data) {
  return apiFetch('/timelogs', { method: 'POST', body: JSON.stringify(data) });
}

async function updateTimeLog(id, data) {
  return apiFetch(`/timelogs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteTimeLog(id) {
  return apiFetch(`/timelogs/${id}`, { method: 'DELETE' });
}

// Categories
async function getCategories(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/categories${qs ? `?${qs}` : ''}`);
}

async function createCategory(data) {
  return apiFetch('/categories', { method: 'POST', body: JSON.stringify(data) });
}

async function updateCategory(id, data) {
  return apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteCategory(id) {
  return apiFetch(`/categories/${id}`, { method: 'DELETE' });
}

// Saved content
async function getSavedContent(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/saved-content${qs ? `?${qs}` : ''}`);
}

async function createSavedContent(data) {
  return apiFetch('/saved-content', { method: 'POST', body: JSON.stringify(data) });
}

async function updateSavedContent(id, data) {
  return apiFetch(`/saved-content/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteSavedContent(id) {
  return apiFetch(`/saved-content/${id}`, { method: 'DELETE' });
}

export {
  API_BASE_URL,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  apiFetch,
  login,
  logout,
  getTimeLogs,
  getTimeLog,
  createTimeLog,
  updateTimeLog,
  deleteTimeLog,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSavedContent,
  createSavedContent,
  updateSavedContent,
  deleteSavedContent,
};
