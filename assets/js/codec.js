// Compact, URL-safe encoding of builds and cosmetic looks for share links.
// Format: "w243.h6.c12.k34.a7.l9.x16.dw:120,0,0.dh:3" (all keys optional).

const KEYS = { h: 'head', c: 'chest', a: 'arms', k: 'waist', l: 'legs' };
const BACK = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [v, k]));

export function encodeBuild(build, extra = {}) {
  const parts = [];
  if (build.w) parts.push(`w${build.w}`);
  for (const [kind, id] of Object.entries(build.a || {})) if (id) parts.push(`${BACK[kind]}${id}`);
  if (build.c) parts.push(`x${build.c}`);
  for (const [key, list] of Object.entries(build.d || {})) {
    if (list && list.some(Boolean)) parts.push(`d${key === 'w' ? 'w' : BACK[key]}:${list.map(x => x || 0).join(',')}`);
  }
  for (const [key, val] of Object.entries(build.colors || {})) {
    const k = key === 'w' ? 'w' : (BACK[key] || key[0]);
    parts.push(`p${k}:${(val.p || '').slice(1)}${val.s ? ',' + val.s.slice(1) : ''}`);
  }
  if (extra.name) parts.push(`n${encodeURIComponent(extra.name).replace(/\./g, '%2E')}`);
  return parts.join('.');
}

export function decodeBuild(str) {
  const build = { w: null, a: {}, c: null, d: {} };
  const meta = {};
  if (!str || typeof str !== 'string') return null;
  for (const part of str.split('.')) {
    const tag = part[0], rest = part.slice(1);
    if (tag === 'w' && /^\d+$/.test(rest)) build.w = +rest;
    else if (KEYS[tag] && /^\d+$/.test(rest)) build.a[KEYS[tag]] = +rest;
    else if (tag === 'x' && /^\d+$/.test(rest)) build.c = +rest;
    else if (tag === 'd') {
      const [k, list] = rest.split(':');
      const key = k === 'w' ? 'w' : KEYS[k];
      if (key && list) build.d[key] = list.split(',').map(x => (+x > 0 ? +x : null));
    } else if (tag === 'p') {
      const [k, list] = rest.split(':');
      const key = k === 'w' ? 'w' : (KEYS[k] || (k === 's' ? 'skin' : null));
      if (key && list) {
        const [p, s] = list.split(',');
        build.colors = build.colors || {};
        build.colors[key] = {};
        if (/^[0-9a-f]{6}$/i.test(p)) build.colors[key].p = `#${p}`;
        if (s && /^[0-9a-f]{6}$/i.test(s)) build.colors[key].s = `#${s}`;
      }
    } else if (tag === 'n') {
      try { meta.name = decodeURIComponent(rest).slice(0, 60); } catch { /* ignore */ }
    }
  }
  return { build, meta };
}

/** Accepts a full share URL, a raw code or a JSON export. */
export function parseImport(text) {
  const s = (text || '').trim();
  if (!s) return null;
  if (s.startsWith('{')) {
    try {
      const obj = JSON.parse(s);
      const b = obj.build || obj;
      if (b && (b.w || b.a)) return { build: { w: b.w || null, a: b.a || {}, c: b.c || null, d: b.d || {}, colors: b.colors }, meta: { name: obj.name } };
    } catch { return null; }
    return null;
  }
  const m = s.match(/[?&]b=([^&#\s]+)/);
  return decodeBuild(m ? decodeURIComponent(m[1]) : s);
}
