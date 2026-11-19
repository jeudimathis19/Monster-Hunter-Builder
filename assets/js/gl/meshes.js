// Procedural unit meshes (sphere, tapered tube, rounded box, cone, ring) with smooth normals.

function finish(pos, nor, idx) {
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

/** Unit sphere (radius 1). Optional `squash` flattens the bottom half (domes). */
export function sphere(lat = 18, lon = 24) {
  const pos = [], nor = [], idx = [];
  for (let i = 0; i <= lat; i++) {
    const th = (i / lat) * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let j = 0; j <= lon; j++) {
      const ph = (j / lon) * Math.PI * 2;
      const x = st * Math.cos(ph), y = ct, z = st * Math.sin(ph);
      pos.push(x, y, z); nor.push(x, y, z);
    }
  }
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j, b = a + lon + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return finish(pos, nor, idx);
}

/** Half sphere (dome) opening downwards, y in [0,1]. */
export function dome(lat = 10, lon = 24) {
  const pos = [], nor = [], idx = [];
  for (let i = 0; i <= lat; i++) {
    const th = (i / lat) * Math.PI / 2, st = Math.sin(th), ct = Math.cos(th);
    for (let j = 0; j <= lon; j++) {
      const ph = (j / lon) * Math.PI * 2;
      const x = st * Math.cos(ph), y = ct, z = st * Math.sin(ph);
      pos.push(x, y, z); nor.push(x, y, z);
    }
  }
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j, b = a + lon + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
      idx.push(a, a + 1, b, b, a + 1, b + 1); // double-sided
    }
  }
  return finish(pos, nor, idx);
}

/** Tube along Y from 0 to 1 with radius r0 at the bottom and r1 at the top, capped. */
export function tube(r0 = 1, r1 = 1, seg = 20, rings = 4) {
  const pos = [], nor = [], idx = [];
  const slope = (r0 - r1);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= seg; j++) {
      const ph = (j / seg) * Math.PI * 2, c = Math.cos(ph), s = Math.sin(ph);
      pos.push(r * c, t, r * s);
      const n = [c, slope, s], l = Math.hypot(...n);
      nor.push(n[0] / l, n[1] / l, n[2] / l);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // caps
  for (const [y, r, ny] of [[0, r0, -1], [1, r1, 1]]) {
    const center = pos.length / 3;
    pos.push(0, y, 0); nor.push(0, ny, 0);
    for (let j = 0; j <= seg; j++) {
      const ph = (j / seg) * Math.PI * 2;
      pos.push(r * Math.cos(ph), y, r * Math.sin(ph)); nor.push(0, ny, 0);
    }
    for (let j = 0; j < seg; j++) {
      if (ny < 0) idx.push(center, center + 1 + j, center + 2 + j);
      else idx.push(center, center + 2 + j, center + 1 + j);
    }
  }
  return finish(pos, nor, idx);
}

/** Rounded box: superellipsoid, size 2 (from -1 to 1), roundness e (0.1 = boxy, 1 = sphere). */
export function roundBox(e = 0.25, lat = 16, lon = 24) {
  const pos = [], nor = [], idx = [];
  const sgn = v => (v < 0 ? -1 : 1);
  const p = (v, k) => sgn(v) * Math.pow(Math.abs(v), k);
  for (let i = 0; i <= lat; i++) {
    const th = -Math.PI / 2 + (i / lat) * Math.PI;
    for (let j = 0; j <= lon; j++) {
      const ph = -Math.PI + (j / lon) * Math.PI * 2;
      const ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
      const x = p(ct, e) * p(cp, e), y = p(st, e), z = p(ct, e) * p(sp, e);
      pos.push(x, y, z);
      const nx = p(ct, 2 - e) * p(cp, 2 - e), ny = p(st, 2 - e), nz = p(ct, 2 - e) * p(sp, 2 - e);
      const l = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / l, ny / l, nz / l);
    }
  }
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j, b = a + lon + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  return finish(pos, nor, idx);
}

/** Torus ring in the XZ plane (major radius 1, minor radius r). */
export function ring(r = 0.15, seg = 28, sides = 10) {
  const pos = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= sides; j++) {
      const v = (j / sides) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
      pos.push((1 + r * cv) * cu, r * sv, (1 + r * cv) * su);
      nor.push(cv * cu, sv, cv * su);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  return finish(pos, nor, idx);
}

/** Flat disc (for the ground shadow), y = 0, radius 1. */
export function disc(seg = 40) {
  const pos = [0, 0, 0], nor = [0, 1, 0], idx = [];
  for (let j = 0; j <= seg; j++) {
    const ph = (j / seg) * Math.PI * 2;
    pos.push(Math.cos(ph), 0, Math.sin(ph)); nor.push(0, 1, 0);
  }
  for (let j = 0; j < seg; j++) idx.push(0, j + 2, j + 1);
  return finish(pos, nor, idx);
}

/**
 * Flat-shaded copy of an indexed mesh: every triangle gets its own face normal (oriented like the
 * original smooth normals), which turns round primitives into crisp, forged-looking facets.
 */
export function flatten(m) {
  const pos = [], nor = [], idx = [];
  const P = i => [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]];
  const N = i => [m.nor[i * 3], m.nor[i * 3 + 1], m.nor[i * 3 + 2]];
  for (let t = 0; t < m.idx.length; t += 3) {
    const [a, b, c] = [m.idx[t], m.idx[t + 1], m.idx[t + 2]];
    const pa = P(a), pb = P(b), pc = P(c);
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n);
    if (l < 1e-9) continue; // degenerate (poles)
    n = n.map(x => x / l);
    const s = [N(a), N(b), N(c)].reduce((acc, q) => [acc[0] + q[0], acc[1] + q[1], acc[2] + q[2]], [0, 0, 0]);
    if (n[0] * s[0] + n[1] * s[1] + n[2] * s[2] < 0) n = n.map(x => -x);
    for (const p of [pa, pb, pc]) { pos.push(...p); nor.push(...n); idx.push(idx.length); }
  }
  return finish(pos, nor, idx);
}

/**
 * Forged plate: a 2D outline (points in [-1,1], star-shaped around the origin) extruded along Z,
 * with a raised central ridge on both faces and bevelled edges. Flat-shaded.
 */
export function plate(outline, ridge = 1, rim = 0.3) {
  const pos = [], nor = [], idx = [];
  const tri = (p0, p1, p2, out) => {
    const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n);
    if (l < 1e-9) return;
    n = n.map(x => x / l);
    if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) n = n.map(x => -x);
    for (const p of [p0, p1, p2]) { pos.push(...p); nor.push(...n); idx.push(idx.length); }
  };
  const k = outline.length;
  for (let i = 0; i < k; i++) {
    const [ax, ay] = outline[i], [bx, by] = outline[(i + 1) % k];
    tri([0, 0, ridge], [ax, ay, rim], [bx, by, rim], [0, 0, 1]);
    tri([0, 0, -ridge], [bx, by, -rim], [ax, ay, -rim], [0, 0, -1]);
    const out = [(ax + bx) / 2, (ay + by) / 2, 0];
    tri([ax, ay, rim], [bx, by, rim], [bx, by, -rim], out);
    tri([ax, ay, rim], [bx, by, -rim], [ax, ay, -rim], out);
  }
  return finish(pos, nor, idx);
}

/** Saw-tooth edge between two y values on side x (teeth lean towards the tip). */
function teeth(x, y0, y1, n, depth, lean = 0.1) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t0 = y0 + (y1 - y0) * (i / n), t1 = y0 + (y1 - y0) * ((i + 0.5) / n);
    pts.push([x, t0], [x * (1 + depth), t1 + lean]);
  }
  return pts;
}

/** Outlines for forged plates and blades (y up, tip at +1). */
export const OUTLINES = {
  kite: [[0, 1], [0.7, 0.35], [0.55, -0.7], [0, -1], [-0.55, -0.7], [-0.7, 0.35]],
  shard: [[0, 1], [0.38, 0.25], [0.25, -1], [-0.25, -1], [-0.38, 0.25]],
  fang: [[0, 1], [0.5, -1], [-0.5, -1]],
  hexp: [[0, 1], [0.87, 0.5], [0.87, -0.5], [0, -1], [-0.87, -0.5], [-0.87, 0.5]],
  wingp: [[-1, -0.3], [-0.5, 0.5], [0.1, 1], [1, 0.75], [0.55, 0.35], [0.95, 0.1], [0.45, -0.15], [0.75, -0.55], [0.1, -0.5], [-0.3, -0.8]],
  'blade-straight': [[0, 1], [1, 0.82], [1, -1], [-1, -1], [-1, 0.82]],
  'blade-serrated': [[0, 1], [1, 0.82], ...teeth(1, 0.7, -0.9, 7, 0.32), [1, -1], [-1, -1], ...teeth(-1, -0.9, 0.7, 7, 0.32), [-1, 0.82]],
  'blade-jagged': [[0.2, 1], [1.25, 0.72], [0.9, 0.5], [1.4, 0.18], [0.95, -0.05], [1.3, -0.4], [0.9, -0.6], [1, -1], [-1, -1], [-1, -0.3], [-1.25, -0.1], [-1, 0.25], [-1.15, 0.55], [-0.8, 0.8]],
  'blade-leaf': [[0, 1], [0.75, 0.72], [1.15, 0.3], [1.05, -0.2], [0.7, -0.75], [0.6, -1], [-0.6, -1], [-0.7, -0.75], [-1.05, -0.2], [-1.15, 0.3], [-0.75, 0.72]],
  'blade-cleaver': [[-1, 1], [0.55, 1], [1.15, 0.55], [1.15, 0.1], [0.95, 0.05], [1, -1], [-1, -1], [-1, 0.5], [-1.2, 0.62]],
  'blade-curved': [[0.55, 1], [1, 0.6], [1, -1], [-1, -1], [-1, 0.45], [-0.4, 0.85]]
};
