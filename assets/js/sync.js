// Keeps favorites and published builds attached to the visitor's account.

import { favorites } from './store.js';
import { isSignedIn, onAuthChange } from './auth.js';
import { cloudFavorites, claimOwnedBuilds, accountsEnabled } from './api.js';

let started = false;

/** Merges device and account favorites, then keeps both in sync. */
export async function syncAccount() {
  if (!accountsEnabled() || !isSignedIn()) return;
  try {
    const cloud = await cloudFavorites.list();
    const cloudIds = new Set(cloud.map(f => f.id));
    const local = favorites.all();
    for (const f of local) if (!cloudIds.has(f.id)) await cloudFavorites.save(f);
    const merged = new Map();
    for (const f of [...cloud, ...local]) if (!merged.has(f.id)) merged.set(f.id, f);
    favorites.replaceAll([...merged.values()].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)));
    await claimOwnedBuilds();
  } catch (err) {
    console.warn('Account sync failed', err);
  }
}

export function startSync() {
  if (started || !accountsEnabled()) return;
  started = true;
  favorites.onChange((type, value) => {
    if (!isSignedIn()) return;
    const job = type === 'add' ? cloudFavorites.save(value) : cloudFavorites.remove(value);
    job.catch(err => console.warn('Favorite sync failed', err));
  });
  let wasSignedIn = isSignedIn();
  onAuthChange(() => {
    const now = isSignedIn();
    if (now && !wasSignedIn) syncAccount();
    if (!now && wasSignedIn) favorites.replaceAll([]); // favorites belong to the account
    wasSignedIn = now;
  });
  if (wasSignedIn) syncAccount();
  else favorites.replaceAll([]); // favorites need an account
}
