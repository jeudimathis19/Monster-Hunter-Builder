// Small WebGL renderer: smooth-shaded parts with warm key light, cool fill, rim light and soft ground shadow.

import { perspective, lookAt, mul, normalMat, rotY, ident } from './math.js';
import { sphere, dome, tube, roundBox, ring, disc } from './meshes.js';

const VS = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uM; uniform mat4 uVP; uniform mat4 uR; uniform mat3 uN;
varying vec3 vN; varying vec3 vW;
void main() {
  vec4 w = uR * uM * vec4(aPos, 1.0);
  vW = w.xyz;
  vN = mat3(uR) * (uN * aNor);
  gl_Position = uVP * w;
}`;

const FS = `
precision mediump float;
varying vec3 vN; varying vec3 vW;
uniform vec3 uColor; uniform vec3 uEye;
uniform float uSpec; uniform float uShin; uniform float uAlpha; uniform float uEmit; uniform float uSheen;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(uEye - vW);
  vec3 L1 = normalize(vec3(0.55, 0.85, 0.75));
  vec3 L2 = normalize(vec3(-0.8, 0.25, -0.45));
  float d1 = max(dot(n, L1), 0.0);
  float d2 = max(dot(n, L2), 0.0);
  vec3 hemi = mix(vec3(0.16, 0.13, 0.11), vec3(0.40, 0.38, 0.36), n.y * 0.5 + 0.5);
  vec3 col = uColor * (hemi + d1 * vec3(1.0, 0.93, 0.80) * 0.95 + d2 * vec3(0.45, 0.58, 0.80) * 0.35);
  vec3 h = normalize(L1 + v);
  col += pow(max(dot(n, h), 0.0), uShin) * uSpec * vec3(1.0, 0.95, 0.86);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  col += fres * (0.18 + uSheen) * vec3(1.0, 0.82, 0.62);
  col += uColor * uEmit;
  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.92)), uAlpha);
}`;

const MESH_FACTORIES = {
  sphere: () => sphere(18, 24),
  lowsphere: () => sphere(8, 10),
  crystal: () => sphere(2, 4),
  dome: () => dome(10, 24),
  box: () => roundBox(0.2, 12, 16),
  slab: () => roundBox(0.45, 12, 16),
  ring: () => ring(0.18),
  disc: () => disc(),
  tube: () => tube(1, 1, 18, 3),
  cone: () => tube(1, 0.02, 14, 3),
  taper: () => tube(1, 0.6, 18, 3)
};

let software = false;
/** True when WebGL runs on a software rasterizer (no GPU acceleration). Call supportsWebGL() first. */
export const isSoftwareGL = () => software;

/** True when WebGL works. Also detects software rasterizers (no GPU) to render lighter. */
export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'));
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    software = /swiftshader|llvmpipe|software|basic render/i.test(name);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch { return false; }
}

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: !software, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.canvas = canvas;
    this.meshes = new Map();
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog = prog;
    this.a = { pos: gl.getAttribLocation(prog, 'aPos'), nor: gl.getAttribLocation(prog, 'aNor') };
    this.u = {};
    for (const n of ['uM', 'uVP', 'uR', 'uN', 'uColor', 'uEye', 'uSpec', 'uShin', 'uAlpha', 'uEmit', 'uSheen']) this.u[n] = gl.getUniformLocation(prog, n);
    this.parts = [];
  }

  mesh(name) {
    if (this.meshes.has(name)) return this.meshes.get(name);
    const gl = this.gl;
    // "tube:0.6" = tube whose top radius is 0.6 x the bottom radius.
    const data = name.startsWith('tube:') ? tube(1, Math.max(0.02, +name.slice(5)), 18, 3) : MESH_FACTORIES[name]();
    const m = { count: data.idx.length };
    m.pos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.pos); gl.bufferData(gl.ARRAY_BUFFER, data.pos, gl.STATIC_DRAW);
    m.nor = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.nor); gl.bufferData(gl.ARRAY_BUFFER, data.nor, gl.STATIC_DRAW);
    m.idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.idx, gl.STATIC_DRAW);
    this.meshes.set(name, m);
    return m;
  }

  /** parts: [{ mesh, m (Float32Array 16), color [r,g,b], spec, shin, alpha, emit, sheen }] */
  setParts(parts) {
    this.parts = parts.map(p => ({ ...p, n: normalMat(p.m) }));
  }

  resize(width, height) {
    const dpr = software ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  render(angle = -0.5, { zoom = 1 } = {}) {
    const gl = this.gl, u = this.u;
    const w = this.canvas.width, h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.prog);

    const eye = [0, 1.25, 4.1 / zoom];
    const proj = perspective(0.52, w / h, 0.1, 30);
    const view = lookAt(eye, [0, 0.93, 0], [0, 1, 0]);
    gl.uniformMatrix4fv(u.uVP, false, mul(proj, view));
    gl.uniform3fv(u.uEye, eye);
    const R = rotY(angle);

    gl.enableVertexAttribArray(this.a.pos);
    gl.enableVertexAttribArray(this.a.nor);
    const drawPart = (p, rot) => {
      const m = this.mesh(p.mesh);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.pos); gl.vertexAttribPointer(this.a.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.nor); gl.vertexAttribPointer(this.a.nor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx);
      gl.uniformMatrix4fv(u.uM, false, p.m);
      gl.uniformMatrix4fv(u.uR, false, rot);
      gl.uniformMatrix3fv(u.uN, false, p.n);
      gl.uniform3fv(u.uColor, p.color);
      gl.uniform1f(u.uSpec, p.spec ?? 0.25);
      gl.uniform1f(u.uShin, p.shin ?? 24);
      gl.uniform1f(u.uAlpha, p.alpha ?? 1);
      gl.uniform1f(u.uEmit, p.emit ?? 0);
      gl.uniform1f(u.uSheen, p.sheen ?? 0);
      gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
    };
    for (const p of this.parts) if (!p.shadow) drawPart(p, R);
    // Ground shadow last, blended, not rotating.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    for (const p of this.parts) if (p.shadow) drawPart(p, ident());
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  dispose() {
    const gl = this.gl;
    for (const m of this.meshes.values()) { gl.deleteBuffer(m.pos); gl.deleteBuffer(m.nor); gl.deleteBuffer(m.idx); }
    this.meshes.clear();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}
