// Visitor accounts (Supabase Auth REST API, email + password, no SDK).

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const BASE = SUPABASE_URL ? SUPABASE_URL.replace(/\/+$/, '') : '';
const KEY = 'mhb:auth';
const listeners = new Set();
let session = load();
let refreshing = null;

export const authEnabled = () => !!(BASE && SUPABASE_ANON_KEY);

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
function save(next) {
  session = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch { /* storage disabled */ }
  for (const fn of listeners) { try { fn(session); } catch (err) { console.warn(err); } }
}

export class AuthError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

/** Current account: { id, email, username } or null. */
export const currentUser = () => (session && session.user ? { ...session.user, username: session.username } : null);
export const isSignedIn = () => !!(session && session.refresh_token);
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Page URL used in confirmation and password-reset emails. */
const redirectUrl = route => `${location.origin}${location.pathname}#${route}`;

async function call(path, { method = 'POST', body, token, query = '' } = {}) {
  const headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/auth/v1/${path}${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const code = data.error_code || data.code || data.error || `http_${res.status}`;
    throw new AuthError(String(code), data.msg || data.error_description || data.message || code);
  }
  return data;
}

async function rest(path, token) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  return res.ok ? res.json() : null;
}

async function storeTokens(data, extra = {}) {
  const expiresAt = data.expires_at ? +data.expires_at : Math.floor(Date.now() / 1000) + (+data.expires_in || 3600);
  let user = data.user;
  if (!user) user = await call('user', { method: 'GET', token: data.access_token });
  const profile = await rest('profiles?select=username', data.access_token);
  save({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user: { id: user.id, email: user.email },
    username: (profile && profile[0] && profile[0].username) || (user.user_metadata && user.user_metadata.username) || '',
    ...extra
  });
}

/** Valid access token (refreshed when needed), or null when signed out. */
export async function accessToken() {
  if (!session || !session.refresh_token) return null;
  if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
  if (!refreshing) {
    refreshing = call('token', { query: '?grant_type=refresh_token', body: { refresh_token: session.refresh_token } })
      .then(data => storeTokens(data))
      .catch(err => { if (err.code !== 'http_0') save(null); })
      .finally(() => { refreshing = null; });
  }
  await refreshing;
  return session ? session.access_token : null;
}

export async function signUp(email, password, username) {
  const data = await call('signup', {
    query: `?redirect_to=${encodeURIComponent(redirectUrl('/account'))}`,
    body: { email, password, data: { username } }
  });
  if (data.access_token) { await storeTokens(data); return { confirmed: true }; }
  return { confirmed: false };
}

export async function signIn(email, password) {
  const data = await call('token', { query: '?grant_type=password', body: { email, password } });
  await storeTokens(data);
}

export async function signOut() {
  const token = session && session.access_token;
  save(null);
  if (token) { try { await call('logout', { token }); } catch { /* already expired */ } }
}

export const requestPasswordReset = email =>
  call('recover', { query: `?redirect_to=${encodeURIComponent(redirectUrl('/account'))}`, body: { email } });

export async function updatePassword(password) {
  const token = await accessToken();
  if (!token) throw new AuthError('not_signed_in');
  await call('user', { method: 'PUT', token, body: { password } });
  if (session && session.recovery) save({ ...session, recovery: false });
}

export function setUsername(username) {
  if (session) save({ ...session, username });
}

/**
 * Handles the redirect from a confirmation or password-reset email
 * (#access_token=...&refresh_token=...&type=signup|recovery). Returns the route to open.
 */
export async function handleAuthRedirect() {
  const hash = location.hash.replace(/^#/, '');
  if (!/(^|&)(access_token|error)=/.test(hash)) return null;
  const params = new URLSearchParams(hash);
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  if (params.get('error')) return `/account?error=${encodeURIComponent(params.get('error_code') || params.get('error'))}`;
  try {
    await storeTokens({
      access_token: params.get('access_token'), refresh_token: params.get('refresh_token'),
      expires_at: params.get('expires_at'), expires_in: params.get('expires_in')
    }, { recovery: params.get('type') === 'recovery' });
    return params.get('type') === 'recovery' ? '/account?reset=1' : '/account?welcome=1';
  } catch {
    return '/account?error=link';
  }
}
