import { getAuthToken } from './api.js';

// Use Vite env variable when available; otherwise fall back to same-origin proxy path
const PROXY_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PROXY_API_URL) || '/api/ai';

async function callProxy(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${PROXY_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let body = null;
    try { body = JSON.parse(text); } catch { body = text; }
    const err = new Error(body?.message || `Proxy API error ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

export async function summarize(text) {
  return callProxy('/summarize', { method: 'POST', body: JSON.stringify({ text }) });
}

export async function ask(prompt) {
  return callProxy('/ask', { method: 'POST', body: JSON.stringify({ Prompt: prompt }) });
}

export default { callProxy, summarize, ask };
