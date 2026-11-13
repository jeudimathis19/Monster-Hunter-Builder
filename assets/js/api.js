// Community API client. The Node server injects <meta name="mhb-api" content="api/">;
// on static hosting (GitHub Pages) the meta is empty and community features fall back gracefully.

import { voterId, owned } from './store.js';

const meta = document.querySelector('meta[name="mhb-api"]');
const BASE = meta ? meta.content : '';

export const hasCommunity = () => !!BASE;

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'X-Voter': voterId() };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function listBuilds(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
  return request(`builds?${qs}`);
}

export const getBuild = (id, view) => request(`builds/${encodeURIComponent(id)}${view ? '?view=1' : ''}`);

export async function publishBuild(payload) {
  const res = await request('builds', { method: 'POST', body: payload });
  owned.add(res.id, res.token);
  return res;
}

export const updateBuild = (id, payload) =>
  request(`builds/${encodeURIComponent(id)}`, { method: 'PUT', body: payload, token: owned.token(id) });

export async function deleteBuild(id) {
  await request(`builds/${encodeURIComponent(id)}`, { method: 'DELETE', token: owned.token(id) });
  owned.remove(id);
}

export const likeBuild = id => request(`builds/${encodeURIComponent(id)}/like`, { method: 'POST' });
