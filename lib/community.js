'use strict';

/**
 * Community builds: validation, publishing, listing and likes.
 */

const crypto = require('crypto');

const ARMOR_KINDS = ['head', 'chest', 'arms', 'waist', 'legs'];
const PLAYSTYLES = ['aggressive', 'defensive', 'technical', 'support', 'balanced', 'speedrun', 'status', 'custom'];
const TYPES = ['build', 'cosmetic'];
const LIMITS = { name: 60, author: 32, description: 1000 };
const HEX = /^#[0-9a-fA-F]{6}$/;

class ValidationError extends Error {}

const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const cleanText = (value, max) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ValidationError('Invalid text field');
  // Strip control characters, collapse whitespace at the ends.
  const v = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (v.length > max) throw new ValidationError(`Text too long (max ${max})`);
  return v || null;
};
const isId = v => Number.isInteger(v) && v > 0;

function createCommunity(db) {
  const q = {
    weapon: db.prepare('SELECT id, kind, slots, hr, rank FROM weapons WHERE id = ?'),
    armor: db.prepare('SELECT id, kind, slots, hr, rank FROM armor WHERE id = ?'),
    charm: db.prepare('SELECT id, hr, rank FROM (SELECT id, hr, CASE WHEN rarity >= 5 THEN \'high\' ELSE \'low\' END AS rank FROM charms) WHERE id = ?'),
    deco: db.prepare('SELECT id, kind, slot FROM decorations WHERE id = ?'),
    insert: db.prepare(`INSERT INTO builds (id, type, token_hash, name, author, description, weapon_kind, playstyle, hr, rank, lang, data)
      VALUES (@id, @type, @token_hash, @name, @author, @description, @weapon_kind, @playstyle, @hr, @rank, @lang, @data)`),
    update: db.prepare(`UPDATE builds SET name=@name, author=@author, description=@description, weapon_kind=@weapon_kind,
      playstyle=@playstyle, hr=@hr, rank=@rank, lang=@lang, data=@data, updated_at=CURRENT_TIMESTAMP WHERE id=@id`),
    get: db.prepare('SELECT * FROM builds WHERE id = ?'),
    del: db.prepare('DELETE FROM builds WHERE id = ?'),
    view: db.prepare('UPDATE builds SET views = views + 1 WHERE id = ?'),
    liked: db.prepare('SELECT 1 FROM build_likes WHERE build_id = ? AND voter = ?'),
    like: db.prepare('INSERT INTO build_likes (build_id, voter) VALUES (?, ?)'),
    unlike: db.prepare('DELETE FROM build_likes WHERE build_id = ? AND voter = ?'),
    recount: db.prepare('UPDATE builds SET likes = (SELECT COUNT(*) FROM build_likes WHERE build_id = ?) WHERE id = ?'),
    delLikes: db.prepare('DELETE FROM build_likes WHERE build_id = ?')
  };

  /** Validates a build against the game data and returns its normalized form + derived info. */
  function validateBuild(build, type = 'build') {
    if (!build || typeof build !== 'object') throw new ValidationError('Missing build');
    if (type === 'cosmetic') return validateCosmetic(build);
    const out = { w: null, a: {}, c: null, d: {} };
    let hr = 1, high = false;
    const track = row => { hr = Math.max(hr, row.hr); if (row.rank === 'high') high = true; };

    const checkDecos = (key, slots, list, kind) => {
      if (list === undefined || list === null) return;
      if (!Array.isArray(list) || list.length > slots.length) throw new ValidationError(`Invalid decorations for ${key}`);
      out.d[key] = list.map((id, i) => {
        if (id === null) return null;
        const d = isId(id) && q.deco.get(id);
        if (!d || d.kind !== kind || d.slot > slots[i]) throw new ValidationError(`Decoration ${id} does not fit ${key}`);
        return id;
      });
    };

    if (!isId(build.w)) throw new ValidationError('A weapon is required');
    const weapon = q.weapon.get(build.w);
    if (!weapon) throw new ValidationError('Unknown weapon');
    out.w = weapon.id; track(weapon);
    checkDecos('w', JSON.parse(weapon.slots), build.d && build.d.w, 'weapon');

    for (const kind of ARMOR_KINDS) {
      const id = build.a && build.a[kind];
      if (id === undefined || id === null) continue;
      const piece = isId(id) && q.armor.get(id);
      if (!piece || piece.kind !== kind) throw new ValidationError(`Invalid ${kind} armor`);
      out.a[kind] = piece.id; track(piece);
      checkDecos(kind, JSON.parse(piece.slots), build.d && build.d[kind], 'armor');
    }

    if (build.c !== undefined && build.c !== null) {
      const charm = isId(build.c) && q.charm.get(build.c);
      if (!charm) throw new ValidationError('Unknown charm');
      out.c = charm.id; track(charm);
    }
    return { data: out, hr, rank: high ? 'high' : 'low', weaponKind: weapon.kind };
  }

  /** Cosmetic sets: armor appearance, optional weapon and in-game colors per piece. */
  function validateCosmetic(look) {
    const out = { w: null, a: {}, colors: {} };
    let hr = 1, high = false, weaponKind = null;
    const track = row => { hr = Math.max(hr, row.hr); if (row.rank === 'high') high = true; };
    if (look.w !== undefined && look.w !== null) {
      const weapon = isId(look.w) && q.weapon.get(look.w);
      if (!weapon) throw new ValidationError('Unknown weapon');
      out.w = weapon.id; weaponKind = weapon.kind; track(weapon);
    }
    for (const kind of ARMOR_KINDS) {
      const id = look.a && look.a[kind];
      if (id === undefined || id === null) continue;
      const piece = isId(id) && q.armor.get(id);
      if (!piece || piece.kind !== kind) throw new ValidationError(`Invalid ${kind} armor`);
      out.a[kind] = piece.id; track(piece);
    }
    if (!Object.keys(out.a).length) throw new ValidationError('Pick at least one armor piece');
    const colors = look.colors && typeof look.colors === 'object' ? look.colors : {};
    for (const key of [...ARMOR_KINDS, 'w', 'skin', 'hair']) {
      const c = colors[key];
      if (!c) continue;
      const entry = typeof c === 'string' ? { p: c } : c;
      const clean = {};
      for (const k of ['p', 's']) {
        if (entry[k] === undefined) continue;
        if (typeof entry[k] !== 'string' || !HEX.test(entry[k])) throw new ValidationError('Invalid color');
        clean[k] = entry[k].toLowerCase();
      }
      if (Object.keys(clean).length) out.colors[key] = clean;
    }
    return { data: out, hr, rank: high ? 'high' : 'low', weaponKind };
  }

  function normalizeMeta(body) {
    const name = cleanText(body.name, LIMITS.name);
    if (!name) throw new ValidationError('A build name is required');
    const playstyle = PLAYSTYLES.includes(body.playstyle) ? body.playstyle : 'custom';
    const lang = body.lang === 'en' ? 'en' : 'fr';
    return {
      name, playstyle, lang, type: TYPES.includes(body.type) ? body.type : 'build',
      author: cleanText(body.author, LIMITS.author),
      description: cleanText(body.description, LIMITS.description)
    };
  }

  const toPublic = (row, voter) => ({
    id: row.id, type: row.type, name: row.name, author: row.author, description: row.description,
    weaponKind: row.weapon_kind, playstyle: row.playstyle, hr: row.hr, rank: row.rank, lang: row.lang,
    build: JSON.parse(row.data), likes: row.likes, views: row.views,
    liked: voter ? !!q.liked.get(row.id, voter) : false,
    createdAt: row.created_at, updatedAt: row.updated_at
  });

  function publish(body) {
    const meta = normalizeMeta(body);
    const v = validateBuild(body.build, meta.type);
    const id = crypto.randomBytes(6).toString('base64url');
    const token = crypto.randomBytes(24).toString('base64url');
    q.insert.run({
      id, token_hash: hash(token), ...meta,
      weapon_kind: v.weaponKind, hr: v.hr, rank: v.rank, data: JSON.stringify(v.data)
    });
    return { id, token };
  }

  function authorize(id, token) {
    const row = q.get.get(id);
    if (!row) return { status: 404 };
    if (!token || hash(token) !== row.token_hash) return { status: 403 };
    return { row };
  }

  function update(id, token, body) {
    const auth = authorize(id, token);
    if (auth.status) return auth;
    const meta = normalizeMeta(body);
    delete meta.type;
    const v = validateBuild(body.build, auth.row.type);
    q.update.run({ id, ...meta, weapon_kind: v.weaponKind, hr: v.hr, rank: v.rank, data: JSON.stringify(v.data) });
    return { build: toPublic(q.get.get(id)) };
  }

  const remove = db.transaction((id, token) => {
    const auth = authorize(id, token);
    if (auth.status) return auth;
    q.delLikes.run(id);
    q.del.run(id);
    return { ok: true };
  });

  function get(id, voter, countView) {
    const row = q.get.get(id);
    if (!row) return null;
    if (countView) q.view.run(id);
    return toPublic(row, voter);
  }

  function list({ type, sort, weapon, playstyle, rank, hrMax, search, page, voter }) {
    const where = ['type = @type'], params = { type: TYPES.includes(type) ? type : 'build' };
    if (weapon) { where.push('weapon_kind = @weapon'); params.weapon = weapon; }
    if (playstyle) { where.push('playstyle = @playstyle'); params.playstyle = playstyle; }
    if (rank === 'low' || rank === 'high') { where.push('rank = @rank'); params.rank = rank; }
    if (Number.isInteger(hrMax) && hrMax > 0) { where.push('hr <= @hrMax'); params.hrMax = hrMax; }
    if (search) {
      where.push("(name LIKE @search ESCAPE '\\' OR author LIKE @search ESCAPE '\\' OR description LIKE @search ESCAPE '\\')");
      params.search = `%${search.replace(/[\\%_]/g, c => '\\' + c)}%`;
    }
    const order = sort === 'popular' ? 'likes DESC, created_at DESC'
      : sort === 'views' ? 'views DESC, created_at DESC'
      : 'created_at DESC';
    const size = 24;
    const offset = Math.max(0, (page || 0)) * size;
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM builds ${clause}`).get(params).n;
    const rows = db.prepare(`SELECT * FROM builds ${clause} ORDER BY ${order} LIMIT ${size} OFFSET ${offset}`).all(params);
    return { total, page: page || 0, pageSize: size, builds: rows.map(r => toPublic(r, voter)) };
  }

  const toggleLike = db.transaction((id, voter) => {
    if (!q.get.get(id)) return null;
    const liked = !!q.liked.get(id, voter);
    if (liked) q.unlike.run(id, voter); else q.like.run(id, voter);
    q.recount.run(id, id);
    return { liked: !liked, likes: q.get.get(id).likes };
  });

  return { publish, update, remove, get, list, toggleLike, validateBuild };
}

module.exports = { createCommunity, ValidationError, PLAYSTYLES, TYPES };
