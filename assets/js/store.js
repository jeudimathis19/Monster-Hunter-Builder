// LocalStorage persistence (favorites, own published builds, preferences).

const PREFIX = 'mhb:';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage full or disabled */ }
}

export const prefs = {
  get: (key, fallback) => read(`pref:${key}`, fallback),
  set: (key, value) => write(`pref:${key}`, value)
};

/** Favorites: full snapshots so they work offline and on static hosting. */
export const favorites = {
  all: () => read('favorites', []),
  has: id => favorites.all().some(f => f.id === id),
  add(entry) {
    const list = favorites.all().filter(f => f.id !== entry.id);
    list.unshift({ ...entry, savedAt: Date.now() });
    write('favorites', list.slice(0, 200));
  },
  remove(id) { write('favorites', favorites.all().filter(f => f.id !== id)); },
  toggle(entry) {
    if (favorites.has(entry.id)) { favorites.remove(entry.id); return false; }
    favorites.add(entry); return true;
  }
};

/** Builds this browser published: id -> edit token. */
export const owned = {
  all: () => read('owned', {}),
  token: id => owned.all()[id] || null,
  add(id, token) { write('owned', { ...owned.all(), [id]: token }); },
  remove(id) { const all = owned.all(); delete all[id]; write('owned', all); }
};

/** Material checklist progress per build key. */
export const checklist = {
  get: key => read(`check:${key}`, {}),
  set: (key, value) => write(`check:${key}`, value)
};

/** Draft of the custom builder / cosmetic editor. */
export const drafts = {
  get: key => read(`draft:${key}`, null),
  set: (key, value) => write(`draft:${key}`, value)
};

/** Anonymous voter id used for likes (no account needed). */
export function voterId() {
  let id = read('voter', null);
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    id = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    write('voter', id);
  }
  return id;
}
