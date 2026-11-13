// Community API client (builds and outfits).
// Backends, in order of preference:
//  1. Supabase (assets/js/config.js): works everywhere, including GitHub Pages.
//  2. The optional Node server, which injects <meta name="mhb-api" content="api/">.
// Without either, community features fall back gracefully (share links, local favorites).

import { voterId, owned } from './store.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { loadData } from './data.js';
import { computeBuild, sanitize } from './calc.js';
import { getLang } from './i18n.js';

const meta = document.querySelector('meta[name="mhb-api"]');
const NODE_BASE = meta ? meta.content : '';
const SUPA = SUPABASE_URL && SUPABASE_ANON_KEY ? SUPABASE_URL.replace(/\/+$/, '') : '';

export const hasCommunity = () => !!(SUPA || NODE_BASE);

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// ---------------------------------------------------------------- Node server
async function nodeRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'X-Voter': voterId() };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(NODE_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  return data;
}

// ---------------------------------------------------------------- Supabase (PostgREST, no SDK)
async function supa(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(msg, /forbidden/i.test(msg) ? 403 : /not found/i.test(msg) ? 404 : res.status);
  }
  return { data, res };
}
const rpc = (name, args) => supa(`rpc/${name}`, { method: 'POST', body: args }).then(r => r.data);

// Same shape as the Node API.
const sqlDate = iso => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
const fromRow = (row, liked = false) => ({
  id: row.id, type: row.type, name: row.name, author: row.author, description: row.description,
  weaponKind: row.weapon_kind, playstyle: row.playstyle, hr: row.hr, rank: row.rank, lang: row.lang,
  build: row.data, likes: row.likes, views: row.views, liked,
  createdAt: sqlDate(row.created_at), updatedAt: sqlDate(row.updated_at)
});

async function likedSet(ids) {
  if (!ids.length) return new Set();
  try { return new Set(await rpc('liked_ids', { p_voter: voterId(), p_ids: ids }) || []); } catch { return new Set(); }
}

/** Derived fields (weapon type, HR, rank) computed from the game data, plus a cleaned build. */
async function withDerived(payload) {
  const data = await loadData(getLang());
  const isLook = payload.type === 'cosmetic';
  const clean = isLook
    ? { ...sanitize({ w: payload.build.w, a: payload.build.a, c: null, d: {} }, data), colors: payload.build.colors || {} }
    : sanitize(payload.build, data);
  if (isLook) { delete clean.c; delete clean.d; }
  const c = computeBuild({ w: clean.w, a: clean.a, c: clean.c || null, d: clean.d || {} }, data);
  return { ...payload, build: clean, weaponKind: c.r.weapon ? c.r.weapon.k : null, hr: c.hr, rank: c.rank };
}

// ---------------------------------------------------------------- Public API
const PAGE_SIZE = 24;
const ORDER = { popular: 'likes.desc,created_at.desc', views: 'views.desc,created_at.desc', recent: 'created_at.desc' };

export async function listBuilds(params = {}) {
  if (!SUPA) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
    return nodeRequest(`builds?${qs}`);
  }
  const page = Math.max(0, parseInt(params.page, 10) || 0);
  const q = new URLSearchParams({ select: '*', type: `eq.${params.type === 'cosmetic' ? 'cosmetic' : 'build'}`, order: ORDER[params.sort] || ORDER.recent });
  if (params.weapon) q.set('weapon_kind', `eq.${params.weapon}`);
  if (params.playstyle) q.set('playstyle', `eq.${params.playstyle}`);
  if (params.rank === 'low' || params.rank === 'high') q.set('rank', `eq.${params.rank}`);
  if (+params.hrMax > 0) q.set('hr', `lte.${+params.hrMax}`);
  const search = String(params.q || '').replace(/[,()*%\\]/g, ' ').trim().slice(0, 60);
  if (search) q.set('or', `(name.ilike.*${search}*,author.ilike.*${search}*,description.ilike.*${search}*)`);
  const from = page * PAGE_SIZE;
  const { data, res } = await supa(`builds_public?${q}`, { headers: { Prefer: 'count=exact', Range: `${from}-${from + PAGE_SIZE - 1}` } });
  const total = +((res.headers.get('Content-Range') || '').split('/')[1]) || (data || []).length;
  const liked = await likedSet((data || []).map(r => r.id));
  return { total, page, pageSize: PAGE_SIZE, builds: (data || []).map(r => fromRow(r, liked.has(r.id))) };
}

export async function getBuild(id, view) {
  if (!SUPA) return nodeRequest(`builds/${encodeURIComponent(id)}${view ? '?view=1' : ''}`);
  const { data } = await supa(`builds_public?select=*&id=eq.${encodeURIComponent(id)}`);
  if (!data || !data.length) throw new ApiError('Build not found', 404);
  if (view) rpc('view_build', { p_id: id }).catch(() => {});
  const liked = await likedSet([id]);
  return fromRow(view ? { ...data[0], views: data[0].views + 1 } : data[0], liked.has(id));
}

export async function publishBuild(payload) {
  const res = SUPA
    ? await rpc('publish_build', { p: await withDerived(payload), p_voter: voterId() })
    : await nodeRequest('builds', { method: 'POST', body: payload });
  owned.add(res.id, res.token);
  return res;
}

export async function updateBuild(id, payload) {
  if (!SUPA) return nodeRequest(`builds/${encodeURIComponent(id)}`, { method: 'PUT', body: payload, token: owned.token(id) });
  await rpc('update_build', { p_id: id, p_token: owned.token(id) || '', p: await withDerived(payload) });
  return { id };
}

export async function deleteBuild(id) {
  if (SUPA) await rpc('delete_build', { p_id: id, p_token: owned.token(id) || '' });
  else await nodeRequest(`builds/${encodeURIComponent(id)}`, { method: 'DELETE', token: owned.token(id) });
  owned.remove(id);
}

export const likeBuild = id => (SUPA
  ? rpc('toggle_like', { p_id: id, p_voter: voterId() })
  : nodeRequest(`builds/${encodeURIComponent(id)}/like`, { method: 'POST' }));
