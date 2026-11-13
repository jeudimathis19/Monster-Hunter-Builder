'use strict';

/**
 * Minimal static file server with in-memory Brotli/Gzip compression,
 * strong ETags and cache headers. Only whitelisted paths are exposed, so the
 * database and server sources are never downloadable.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.webmanifest', '.txt']);

function compressEntry(body, ext) {
  const entry = {
    body,
    type: TYPES[ext] || 'application/octet-stream',
    etag: `"${crypto.createHash('sha1').update(body).digest('base64url').slice(0, 20)}"`
  };
  if (COMPRESSIBLE.has(ext) && body.length > 1024) {
    entry.br = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
    entry.gzip = zlib.gzipSync(body, { level: 9 });
  }
  return entry;
}

function send(req, res, entry, cacheControl) {
  res.setHeader('Content-Type', entry.type);
  res.setHeader('ETag', entry.etag);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Vary', 'Accept-Encoding');
  if (req.headers['if-none-match'] === entry.etag) return res.status(304).end();
  const accept = req.headers['accept-encoding'] || '';
  let body = entry.body;
  if (entry.br && /\bbr\b/.test(accept)) { body = entry.br; res.setHeader('Content-Encoding', 'br'); }
  else if (entry.gzip && /\bgzip\b/.test(accept)) { body = entry.gzip; res.setHeader('Content-Encoding', 'gzip'); }
  res.setHeader('Content-Length', body.length);
  return req.method === 'HEAD' ? res.end() : res.end(body);
}

/**
 * @param {string} root  project root
 * @param {object} opts  { files: [...], dirs: [...], dev: boolean }
 */
function staticFiles(root, { files = [], dirs = [], dev = false } = {}) {
  const cache = new Map();

  const load = (rel) => {
    if (!dev && cache.has(rel)) return cache.get(rel);
    const abs = path.join(root, rel);
    if (!abs.startsWith(root + path.sep)) return null;
    let body;
    try { body = fs.readFileSync(abs); } catch { return null; }
    const entry = compressEntry(body, path.extname(rel).toLowerCase());
    cache.set(rel, entry);
    return entry;
  };

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let rel;
    try { rel = decodeURIComponent(req.path).replace(/^\/+/, ''); } catch { return next(); }
    if (rel === '') rel = 'index.html';
    if (rel.includes('..') || rel.includes('\0')) return next();
    const allowed = files.includes(rel) || dirs.some(d => rel.startsWith(d + '/'));
    if (!allowed) return next();
    const entry = load(rel);
    if (!entry) return next();
    const ext = path.extname(rel);
    const cacheControl = ext === '.html' ? 'no-cache'
      : rel.startsWith('data/') ? 'public, max-age=86400, stale-while-revalidate=604800'
      : 'public, max-age=604800, stale-while-revalidate=2592000';
    return send(req, res, entry, cacheControl);
  };
}

module.exports = { staticFiles, compressEntry, send };
