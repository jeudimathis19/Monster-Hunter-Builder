// Small WebGL renderer: smooth-shaded parts with warm key light, cool fill, rim light and soft ground shadow.

import { perspective, lookAt, mul, normalMat, rotY, ident } from './math.js';
import { sphere, dome, tube, roundBox, ring, disc, flatten, plate, OUTLINES } from './meshes.js';

const VS = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uM; uniform mat4 uVP; uniform mat4 uR; uniform mat3 uN;
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
void main() {
  vec4 o = uM * vec4(aPos, 1.0);
  vObj = o.xyz;                       // model space: textures stay fixed while the model turns
  vec4 w = uR * o;
  vW = w.xyz;
  vN = mat3(uR) * (uN * aNor);
  gl_Position = uVP * w;
}`;

// Procedural surfaces: hammered metal, leather, scales, fur, cloth, bone, crystal,
// with bump mapping from the pattern gradient, image-based-style reflections and filmic tone mapping.
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
uniform vec3 uColor; uniform vec3 uEye; uniform mat3 uRot;
uniform float uSpec; uniform float uShin; uniform float uAlpha; uniform float uEmit; uniform float uSheen;
uniform float uPattern; uniform float uBump; uniform float uVar; uniform float uMetal;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
                 mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
                 mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * noise(p); p *= 2.07; a *= 0.5; } return s; }
float pattern(vec3 p) {
  if (uPattern < 0.5) return 0.5;
  if (uPattern < 1.5) return fbm(p * 38.0);                                        // hammered metal
  if (uPattern < 2.5) return fbm(p * 110.0) * 0.7 + noise(p * 18.0) * 0.3;         // leather grain
  if (uPattern < 3.5) {                                                            // overlapping scales
    vec2 q = vec2((p.x + p.z) * 55.0, p.y * 70.0);
    q.x += mod(floor(q.y), 2.0) * 0.5;
    vec2 f = fract(q) - vec2(0.5, 0.15);
    return 1.0 - smoothstep(0.2, 0.62, length(f));
  }
  if (uPattern < 4.5) return noise(vec3(p.x * 140.0, p.y * 14.0, p.z * 140.0)) * 0.8 + noise(p * 30.0) * 0.2; // fur strands
  if (uPattern < 5.5) return 0.5 + 0.22 * sin(p.x * 520.0 + p.z * 520.0) * sin(p.y * 520.0) + 0.15 * noise(p * 60.0); // woven cloth
  if (uPattern < 6.5) return fbm(p * 22.0) * 0.8 + noise(p * 120.0) * 0.2;         // bone / chitin
  return 0.5 + 0.5 * sin((p.x + p.y * 1.7 + p.z) * 90.0);                          // crystal facets
}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float pat = pattern(vObj);
  if (uBump > 0.0) {
    const float e = 0.0015;
    vec3 g = vec3(pattern(vObj + vec3(e, 0.0, 0.0)) - pattern(vObj - vec3(e, 0.0, 0.0)),
                  pattern(vObj + vec3(0.0, e, 0.0)) - pattern(vObj - vec3(0.0, e, 0.0)),
                  pattern(vObj + vec3(0.0, 0.0, e)) - pattern(vObj - vec3(0.0, 0.0, e))) / (2.0 * e);
    g = uRot * g;
    n = normalize(n - uBump * 0.01 * (g - dot(g, n) * n));
  }
  vec3 albedo = uColor * (1.0 + uVar * (pat - 0.5) * 2.0);
  vec3 v = normalize(uEye - vW);
  vec3 L1 = normalize(vec3(0.55, 0.85, 0.75));
  vec3 L2 = normalize(vec3(-0.8, 0.25, -0.45));
  vec3 L3 = normalize(vec3(0.0, 0.35, -1.0));
  float d1 = max(dot(n, L1), 0.0);
  float d2 = max(dot(n, L2), 0.0);
  float d3 = max(dot(n, L3), 0.0);
  float ao = 0.72 + 0.28 * (n.y * 0.5 + 0.5);                                      // cheap ambient occlusion
  vec3 hemi = mix(vec3(0.08, 0.07, 0.06), vec3(0.30, 0.28, 0.27), n.y * 0.5 + 0.5) * ao;
  vec3 diffuse = albedo * (hemi + d1 * vec3(1.0, 0.92, 0.78) * 0.95 + d2 * vec3(0.42, 0.56, 0.82) * 0.28 + d3 * vec3(1.0, 0.7, 0.45) * 0.3);
  vec3 col = diffuse * (1.0 - uMetal * 0.55);
  vec3 h = normalize(L1 + v);
  float spec = pow(max(dot(n, h), 0.0), uShin) * uSpec;
  vec3 specTint = mix(vec3(1.0, 0.95, 0.86), albedo * 1.4 + 0.1, uMetal);
  col += spec * specTint * (0.6 + 0.6 * pat);
  // Fake environment reflection (warm sky above, dark sand below) for metals.
  vec3 r = reflect(-v, n);
  vec3 env = mix(vec3(0.12, 0.09, 0.07), vec3(0.95, 0.82, 0.62), smoothstep(-0.25, 0.6, r.y));
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  col += env * (uMetal * (0.12 + 0.45 * fres)) * mix(vec3(1.0), albedo * 1.4, uMetal * 0.7);
  col += fres * (0.07 + uSheen * 0.7) * vec3(1.0, 0.82, 0.62);
  col += albedo * uEmit;
  col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);         // filmic tone mapping
  gl_FragColor = vec4(pow(clamp(col * 1.08, 0.0, 1.0), vec3(1.06)), uAlpha);
}`;

const MESH_FACTORIES = {
  sphere: () => sphere(26, 34),
  lowsphere: () => sphere(10, 12),
  crystal: () => sphere(2, 4),
  dome: () => dome(14, 34),
  box: () => roundBox(0.2, 16, 22),
  slab: () => roundBox(0.45, 16, 22),
  ring: () => ring(0.18),
  disc: () => disc(),
  tube: () => tube(1, 1, 26, 4),
  cone: () => tube(1, 0.02, 18, 4),
  taper: () => tube(1, 0.6, 18, 3),
  // Faceted (flat-shaded) variants for forged armor plates.
  facet: () => flatten(sphere(7, 10)),
  fdome: () => flatten(dome(4, 10)),
  plate: () => flatten(roundBox(0.14, 6, 8)),
  fcone: () => flatten(tube(1, 0.02, 6, 1)),
  ...Object.fromEntries(Object.entries(OUTLINES).map(([k, o]) => [k, () => plate(o)]))
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
    for (const n of ['uM', 'uVP', 'uR', 'uN', 'uColor', 'uEye', 'uSpec', 'uShin', 'uAlpha', 'uEmit', 'uSheen', 'uRot', 'uPattern', 'uBump', 'uVar', 'uMetal']) this.u[n] = gl.getUniformLocation(prog, n);
    this.parts = [];
  }

  mesh(name) {
    if (this.meshes.has(name)) return this.meshes.get(name);
    const gl = this.gl;
    // "tube:0.6" = tube whose top radius is 0.6 x the bottom radius.
    // "ftube:0.8" = the same, with 8 flat facets.
    const data = name.startsWith('tube:') ? tube(1, Math.max(0.02, +name.slice(5)), 26, 4)
      : name.startsWith('ftube') ? flatten(tube(1, Math.max(0.02, +(name.split(':')[1] || 1)), 8, 1))
      : MESH_FACTORIES[name]();
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
    let rot3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const drawPart = (p, rot) => {
      rot3 = new Float32Array([rot[0], rot[1], rot[2], rot[4], rot[5], rot[6], rot[8], rot[9], rot[10]]);
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
      gl.uniform1f(u.uPattern, p.pattern ?? 0);
      gl.uniform1f(u.uBump, p.bump ?? 0);
      gl.uniform1f(u.uVar, p.vary ?? 0);
      gl.uniform1f(u.uMetal, p.metal ?? 0);
      gl.uniformMatrix3fv(u.uRot, false, rot3);
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
