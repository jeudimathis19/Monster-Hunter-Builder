'use strict';

const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');
const { createCommunitySchema } = require('./lib/schema');
const { LANGS, buildCore, buildText } = require('./lib/bundle');
const { createCommunity, ValidationError, PLAYSTYLES } = require('./lib/community');
const { staticFiles, compressEntry, send } = require('./lib/static');

const PORT = Number(process.env.PORT) || 3000;
// Online community database configured for the front-end (allowed in the CSP).
const SUPABASE_ORIGIN = (() => {
  try {
    const src = require('fs').readFileSync(path.join(__dirname, 'assets', 'js', 'config.js'), 'utf8');
    const m = src.match(/SUPABASE_URL\s*=\s*['"](https:\/\/[^'"/]+)/);
    return m ? m[1] : '';
  } catch { return ''; }
})();
const DEV = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const ROOT = __dirname;

// ---- Database ----------------------------------------------------------
const db = new Database(path.join(ROOT, 'monster_hunter.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
createCommunitySchema(db);
if (!db.prepare("SELECT name FROM sqlite_master WHERE name = 'weapons'").get()) {
  console.error('Game data missing: run "npm run seed" first.');
  process.exit(1);
}
const community = createCommunity(db);

// Localized bundles are computed once and kept compressed in memory.
const bundles = {};
for (const lang of LANGS) {
  const core = buildCore(db, lang);
  bundles[lang] = {
    core,
    coreEntry: compressEntry(Buffer.from(JSON.stringify(core)), '.json'),
    textEntry: compressEntry(Buffer.from(JSON.stringify(buildText(db, lang))), '.json')
  };
}

// ---- App ---------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; " +
    `connect-src 'self'${SUPABASE_ORIGIN ? ' ' + SUPABASE_ORIGIN : ''}; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`);
  next();
});

app.use(express.json({ limit: '32kb' }));

// Small in-memory rate limiter for write operations.
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}${req.route ? req.route.path : ''}:${req.method}`;
    const entry = hits.get(key);
    if (!entry || entry.reset < now) hits.set(key, { count: 1, reset: now + windowMs });
    else if (++entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}, 60_000).unref();

const langOf = req => (LANGS.includes(req.query.lang) ? req.query.lang : 'fr');
const voterOf = req => {
  const v = req.get('X-Voter');
  return typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
};
const tokenOf = req => (req.get('Authorization') || '').replace(/^Bearer\s+/i, '') || null;

// ---- Game data API -----------------------------------------------------
const api = express.Router();

api.get('/health', (req, res) => res.json({ ok: true, community: true }));

api.get('/data/:lang', (req, res) => {
  const lang = req.params.lang.replace(/\.json$/, '').replace(/-text$/, '');
  if (!bundles[lang]) return res.status(404).json({ error: 'Unknown language' });
  const entry = req.params.lang.includes('-text') ? bundles[lang].textEntry : bundles[lang].coreEntry;
  send(req, res, entry, 'public, max-age=3600');
});

const contains = (a, b) => a.toLowerCase().includes(b.toLowerCase());
const listRoute = (name, filters = {}) => api.get(`/${name}`, (req, res) => {
  let list = bundles[langOf(req)].core[name];
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) list = list.filter(x => x.n && contains(x.n, q));
  for (const [param, key] of Object.entries(filters)) {
    const v = req.query[param];
    if (typeof v === 'string' && v) list = list.filter(x => String(x[key]) === v || (key === 'rk' && x.rk === v[0]));
  }
  res.set('Cache-Control', 'public, max-age=3600').json(list);
});
listRoute('weapons', { kind: 'k', rarity: 'r', rank: 'rk', element: 'el' });
listRoute('armor', { kind: 'k', rarity: 'r', rank: 'rk', set: 'set' });
listRoute('sets', { rank: 'rk', rarity: 'r' });
listRoute('decorations', { kind: 'k', slot: 's' });
listRoute('charms', { rarity: 'r' });
listRoute('skills', { kind: 'k' });
listRoute('items', { rarity: 'r' });
listRoute('monsters', { kind: 'k' });

// ---- Community builds --------------------------------------------------
const handle = fn => (req, res) => {
  try { fn(req, res); }
  catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

api.get('/builds', handle((req, res) => {
  const str = v => (typeof v === 'string' ? v.slice(0, 60) : '');
  const result = community.list({
    type: str(req.query.type),
    sort: str(req.query.sort),
    weapon: str(req.query.weapon),
    playstyle: PLAYSTYLES.includes(req.query.playstyle) ? req.query.playstyle : '',
    rank: str(req.query.rank),
    hrMax: parseInt(req.query.hrMax, 10),
    search: str(req.query.q).trim(),
    page: Math.min(Math.max(parseInt(req.query.page, 10) || 0, 0), 1000),
    voter: voterOf(req)
  });
  res.set('Cache-Control', 'no-store').json(result);
}));

api.get('/builds/:id', handle((req, res) => {
  const build = community.get(req.params.id, voterOf(req), req.query.view === '1');
  if (!build) return res.status(404).json({ error: 'Build not found' });
  res.set('Cache-Control', 'no-store').json(build);
}));

api.post('/builds', rateLimit(10, 60 * 60_000), handle((req, res) => {
  res.status(201).json(community.publish(req.body || {}));
}));

api.put('/builds/:id', rateLimit(30, 60 * 60_000), handle((req, res) => {
  const result = community.update(req.params.id, tokenOf(req), req.body || {});
  if (result.status) return res.status(result.status).json({ error: result.status === 404 ? 'Build not found' : 'Forbidden' });
  res.json(result.build);
}));

api.delete('/builds/:id', rateLimit(30, 60 * 60_000), handle((req, res) => {
  const result = community.remove(req.params.id, tokenOf(req));
  if (result.status) return res.status(result.status).json({ error: result.status === 404 ? 'Build not found' : 'Forbidden' });
  res.json({ ok: true });
}));

api.post('/builds/:id/like', rateLimit(120, 60 * 60_000), handle((req, res) => {
  const voter = voterOf(req);
  if (!voter) return res.status(400).json({ error: 'Missing voter id' });
  const result = community.toggleLike(req.params.id, voter);
  if (!result) return res.status(404).json({ error: 'Build not found' });
  res.json(result);
}));

api.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', api);

// ---- Front-end ---------------------------------------------------------
// index.html is shared with the static (GitHub Pages) version: the server enables
// community features by filling the API meta tag.
const fs = require('fs');
let indexEntry = null;
const indexHandler = (req, res) => {
  if (!indexEntry || DEV) {
    const htmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
      .replace('<meta name="mhb-api" content="">', '<meta name="mhb-api" content="api/">');
    indexEntry = compressEntry(Buffer.from(htmlSrc), '.html');
  }
  send(req, res, indexEntry, 'no-cache');
};
app.get(['/', '/index.html'], indexHandler);

app.use(staticFiles(ROOT, {
  files: ['index.html', 'manifest.webmanifest', 'robots.txt', 'favicon.svg'],
  dirs: ['assets', 'data'],
  dev: DEV
}));

app.use((req, res) => res.status(404).type('text/plain').send('Not found'));

app.listen(PORT, () => {
  console.log(`Monster Hunter Builder running at http://localhost:${PORT}`);
});
