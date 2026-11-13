// Minimal column-major 4x4 matrix helpers for the WebGL hunter renderer.

export const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export const translate = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
export const scale = (x, y, z) => { const m = ident(); m[0] = x; m[5] = y; m[10] = z; return m; };
export function rotX(a) { const c = Math.cos(a), s = Math.sin(a), m = ident(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
export function rotY(a) { const c = Math.cos(a), s = Math.sin(a), m = ident(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
export function rotZ(a) { const c = Math.cos(a), s = Math.sin(a), m = ident(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }

/** Composes matrices left to right: chain(A, B, C) = A * B * C. */
export const chain = (...ms) => ms.reduce((a, b) => mul(a, b));

export function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
  return m;
}

export function lookAt(eye, target, up) {
  const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

/** Normal matrix (inverse transpose of the upper 3x3), column-major 3x3. */
export function normalMat(m) {
  const M = (r, c) => m[c * 4 + r];
  const cof = (r, c) => {
    const rs = [0, 1, 2].filter(i => i !== r), cs = [0, 1, 2].filter(i => i !== c);
    const minor = M(rs[0], cs[0]) * M(rs[1], cs[1]) - M(rs[0], cs[1]) * M(rs[1], cs[0]);
    return (r + c) % 2 ? -minor : minor;
  };
  const det = M(0, 0) * cof(0, 0) + M(0, 1) * cof(0, 1) + M(0, 2) * cof(0, 2) || 1e-9;
  const out = new Float32Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) out[c * 3 + r] = cof(r, c) / det;
  return out;
}

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Matrix mapping the unit Y segment [0,1] onto the segment p0 -> p1. */
export function alignY(p0, p1) {
  const d = sub(p1, p0), len = Math.hypot(d[0], d[1], d[2]) || 1e-6;
  const y = [d[0] / len, d[1] / len, d[2] / len];
  const ref = Math.abs(y[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
  const x = norm(cross(ref, y)), z = cross(x, y);
  return { m: new Float32Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, p0[0], p0[1], p0[2], 1]), len };
}

export function hex(c) {
  const v = parseInt((c || '#888888').slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
