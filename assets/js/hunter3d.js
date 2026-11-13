// 3D hunter render: lit WebGL model (assets/js/gl) with a CSS 3D cuboid fallback.
// Each armor piece shapes and colors its body part; the weapon is carried on the back.

import { t } from './i18n.js';
import { icon } from './icons.js';
import { UNDERSUIT } from './look.js';
import { supportsWebGL, Renderer } from './gl/renderer.js';
import { buildModel } from './gl/model.js';

const px = n => `${n}px`;

/** One cuboid centered at (x, y, z). */
function box({ x = 0, y = 0, z = 0, w, h, d, c, c2, rx = 0, ry = 0, rz = 0, trim = false, glow = false, cls = '' }) {
  const style = `--x:${px(x)};--y:${px(y)};--z:${px(z)};--w:${px(w)};--h:${px(h)};--d:${px(d)};--c:${c};--c2:${c2 || c};` +
    `--rx:${rx}deg;--ry:${ry}deg;--rz:${rz}deg`;
  return `<div class="cub${trim ? ' trim' : ''}${glow ? ' glow' : ''} ${cls}" style="${style}"><i class="f fz"></i><i class="f bz"></i><i class="f lx"></i><i class="f rx"></i><i class="f ty"></i><i class="f by"></i></div>`;
}

/** Group of parts sharing a transform. */
const group = (transform, inner) => `<div class="grp" style="transform:${transform}">${inner}</div>`;

function headParts(shape, part, skin) {
  const { p, s } = part;
  const out = [];
  const bare = shape === 'bare' || shape === 'accessory';
  if (bare) {
    out.push(box({ y: -150, w: 30, h: 32, d: 30, c: skin }));
    out.push(box({ y: -168, z: -2, w: 32, h: 8, d: 32, c: '#2a211b' })); // hair
    out.push(box({ x: -7, y: -152, z: 15, w: 5, h: 4, d: 2, c: '#1a1410' }));
    out.push(box({ x: 7, y: -152, z: 15, w: 5, h: 4, d: 2, c: '#1a1410' }));
    if (shape === 'accessory') out.push(box({ y: -152, z: 17, w: 30, h: 6, d: 3, c: p, c2: s, trim: true }));
    return out.join('');
  }
  out.push(box({ y: -150, w: 34, h: 36, d: 34, c: p, c2: s, trim: true }));
  out.push(box({ y: -146, z: 17, w: 20, h: 12, d: 2, c: '#1d1714' })); // face opening
  switch (shape) {
    case 'horns':
      out.push(box({ x: -13, y: -176, w: 6, h: 26, d: 6, c: s, rz: -28 }));
      out.push(box({ x: 13, y: -176, w: 6, h: 26, d: 6, c: s, rz: 28 }));
      break;
    case 'crest':
      out.push(box({ y: -174, w: 5, h: 18, d: 34, c: s }));
      break;
    case 'visor':
      out.push(box({ y: -150, z: 18, w: 32, h: 9, d: 4, c: s }));
      break;
    case 'hood':
      out.push(box({ y: -150, z: -4, w: 40, h: 42, d: 36, c: p, c2: s, trim: true }));
      out.push(box({ y: -146, z: 15, w: 22, h: 18, d: 2, c: skin }));
      break;
    case 'crown':
      for (const x of [-11, 0, 11]) out.push(box({ x, y: -173, w: 5, h: x === 0 ? 16 : 11, d: 5, c: s }));
      break;
    case 'plume':
      out.push(box({ y: -176, z: -8, w: 6, h: 30, d: 20, c: s, rx: 25 }));
      break;
    default: // mask
      out.push(box({ y: -146, z: 18, w: 28, h: 20, d: 4, c: s }));
  }
  return out.join('');
}

function weaponParts(wp) {
  if (!wp) return '';
  const { kind, p, s } = wp;
  const metal = p, accent = s, grip = '#3a2a20';
  const b = o => box(o);
  let inner = '';
  switch (kind) {
    case 'great-sword':
      inner = b({ y: -20, w: 30, h: 150, d: 5, c: metal, c2: accent, trim: true }) + b({ y: 58, w: 48, h: 8, d: 10, c: accent }) + b({ y: 80, w: 8, h: 34, d: 8, c: grip });
      break;
    case 'long-sword':
      inner = b({ y: -30, w: 10, h: 170, d: 4, c: metal, c2: accent, trim: true }) + b({ y: 58, w: 22, h: 6, d: 12, c: accent }) + b({ y: 84, w: 7, h: 42, d: 7, c: grip });
      break;
    case 'sword-shield':
      inner = b({ w: 58, h: 70, d: 7, c: metal, c2: accent, trim: true }) + b({ z: 5, w: 18, h: 18, d: 4, c: accent }) + b({ x: 36, y: 40, w: 7, h: 70, d: 4, c: metal, rz: 10 });
      break;
    case 'dual-blades':
      inner = group('rotateZ(-22deg)', b({ y: -10, w: 9, h: 96, d: 4, c: metal, c2: accent, trim: true }) + b({ y: 46, w: 7, h: 22, d: 7, c: grip })) +
        group('rotateZ(22deg)', b({ y: -10, w: 9, h: 96, d: 4, c: metal, c2: accent, trim: true }) + b({ y: 46, w: 7, h: 22, d: 7, c: grip }));
      break;
    case 'hammer':
      inner = b({ y: 10, w: 9, h: 130, d: 9, c: grip }) + b({ y: -64, w: 54, h: 38, d: 38, c: metal, c2: accent, trim: true });
      break;
    case 'hunting-horn':
      inner = b({ y: 15, w: 10, h: 110, d: 10, c: grip }) + b({ y: -55, w: 46, h: 46, d: 30, c: metal, c2: accent, trim: true }) + b({ x: 26, y: -60, w: 14, h: 26, d: 26, c: accent });
      break;
    case 'lance':
      inner = b({ x: -16, y: -20, w: 12, h: 160, d: 12, c: metal, c2: accent, trim: true }) + b({ x: -16, y: -116, w: 6, h: 36, d: 6, c: accent }) +
        b({ x: 22, y: 10, w: 54, h: 84, d: 7, c: metal, c2: accent, trim: true });
      break;
    case 'gunlance':
      inner = b({ x: -16, y: -20, w: 16, h: 160, d: 16, c: metal, c2: accent, trim: true }) + b({ x: -16, y: -112, w: 9, h: 30, d: 9, c: accent }) +
        b({ x: 24, y: 10, w: 54, h: 84, d: 7, c: metal, c2: accent, trim: true });
      break;
    case 'switch-axe':
      inner = b({ y: 10, w: 10, h: 140, d: 10, c: grip }) + b({ x: 16, y: -52, w: 40, h: 46, d: 6, c: metal, c2: accent, trim: true });
      break;
    case 'charge-blade':
      inner = b({ x: -18, y: -10, w: 16, h: 116, d: 5, c: metal, c2: accent, trim: true }) + b({ x: 24, y: 0, w: 46, h: 70, d: 9, c: metal, c2: accent, trim: true }) + b({ x: 24, y: 0, z: 6, w: 14, h: 30, d: 3, c: accent });
      break;
    case 'insect-glaive':
      inner = b({ w: 7, h: 180, d: 7, c: grip }) + b({ y: -100, w: 14, h: 28, d: 3, c: metal, c2: accent, trim: true }) + b({ y: 100, w: 14, h: 28, d: 3, c: metal, c2: accent, trim: true });
      break;
    case 'bow':
      inner = b({ w: 9, h: 50, d: 8, c: grip }) + b({ x: 8, y: -56, w: 7, h: 72, d: 7, c: metal, c2: accent, trim: true, rz: -18 }) +
        b({ x: 8, y: 56, w: 7, h: 72, d: 7, c: metal, c2: accent, trim: true, rz: 18 }) + b({ x: 20, w: 1, h: 176, d: 1, c: '#e8e0d0' });
      break;
    case 'heavy-bowgun':
      inner = b({ w: 32, h: 110, d: 28, c: metal, c2: accent, trim: true }) + b({ y: -80, w: 13, h: 52, d: 13, c: accent }) + b({ x: 20, y: 40, w: 12, h: 30, d: 20, c: grip });
      break;
    default: // light-bowgun
      inner = b({ w: 24, h: 84, d: 20, c: metal, c2: accent, trim: true }) + b({ y: -60, w: 10, h: 40, d: 10, c: accent }) + b({ x: 15, y: 30, w: 10, h: 24, d: 16, c: grip });
  }
  return group('translate3d(0px, -92px, -34px) rotateZ(32deg)', inner);
}

/** HTML of the full hunter model. */
export function hunterModel(look) {
  const { parts, skin } = look;
  const P = k => parts[k] && parts[k].piece ? parts[k] : { p: UNDERSUIT, s: '#4a4038', rarity: 0 };
  const head = P('head'), chest = P('chest'), arms = P('arms'), waist = P('waist'), legs = P('legs');
  const g = r => r >= 8; // gold glow for rarity 8
  const out = [];
  out.push(headParts(parts.head && parts.head.piece ? look.head : 'bare', head, skin));
  out.push(box({ y: -128, w: 14, h: 10, d: 14, c: skin })); // neck
  // Torso + pauldrons
  out.push(box({ y: -98, w: 60, h: 64, d: 36, c: chest.p, c2: chest.s, trim: true, glow: g(chest.rarity) }));
  out.push(box({ y: -104, z: 19, w: 40, h: 26, d: 3, c: chest.s }));
  if (parts.chest && parts.chest.piece) {
    out.push(box({ x: -42, y: -122, w: 28, h: 18, d: 34, c: chest.p, c2: chest.s, trim: true }));
    out.push(box({ x: 42, y: -122, w: 28, h: 18, d: 34, c: chest.p, c2: chest.s, trim: true }));
  }
  // Arms
  for (const side of [-1, 1]) {
    out.push(box({ x: 40 * side, y: -94, w: 17, h: 40, d: 17, c: parts.arms && parts.arms.piece ? arms.p : UNDERSUIT }));
    out.push(box({ x: 42 * side, y: -54, w: 22, h: 40, d: 22, c: arms.p, c2: arms.s, trim: true, glow: g(arms.rarity) }));
    out.push(box({ x: 42 * side, y: -28, w: 15, h: 14, d: 15, c: parts.arms && parts.arms.piece ? arms.s : skin }));
  }
  // Waist + tassets
  out.push(box({ y: -58, w: 62, h: 20, d: 38, c: waist.p, c2: waist.s, trim: true, glow: g(waist.rarity) }));
  out.push(box({ y: -58, z: 20, w: 12, h: 12, d: 3, c: waist.s }));
  if (parts.waist && parts.waist.piece) {
    out.push(box({ x: -16, y: -34, z: 18, w: 24, h: 28, d: 4, c: waist.p, c2: waist.s, trim: true, rx: -8 }));
    out.push(box({ x: 16, y: -34, z: 18, w: 24, h: 28, d: 4, c: waist.p, c2: waist.s, trim: true, rx: -8 }));
    out.push(box({ y: -34, z: -18, w: 48, h: 28, d: 4, c: waist.p, c2: waist.s, trim: true, rx: 8 }));
  }
  // Legs
  for (const side of [-1, 1]) {
    out.push(box({ x: 15 * side, y: -14, w: 24, h: 44, d: 24, c: parts.legs && parts.legs.piece ? legs.p : UNDERSUIT, c2: legs.s, trim: !!(parts.legs && parts.legs.piece) }));
    out.push(box({ x: 15 * side, y: 30, w: 27, h: 46, d: 28, c: legs.p, c2: legs.s, trim: true, glow: g(legs.rarity) }));
    out.push(box({ x: 15 * side, y: 58, z: 5, w: 27, h: 10, d: 38, c: legs.s }));
  }
  out.push(weaponParts(look.weapon));
  return `<div class="h3d-shadow"></div>${out.join('')}`;
}

let glSupport = null;
let shared = null; // shared offscreen renderer for compact (gallery) renders
function canUseGL() {
  if (glSupport === null) glSupport = supportsWebGL();
  return glSupport;
}
function sharedRenderer() {
  if (!shared) shared = new Renderer(document.createElement('canvas'));
  return shared;
}

/**
 * Mounts an interactive render (drag, keyboard, buttons, slider).
 * Uses WebGL when available (smooth, lit model), CSS 3D cuboids otherwise.
 * Returns { update(look, label), destroy() }.
 */
export function mountHunter(container, look, { label = '', compact = false } = {}) {
  let angle = -28;
  let auto = false, raf = 0, last = 0;
  const id = `h3d-${Math.random().toString(36).slice(2, 8)}`;
  const useGL = canUseGL();
  container.innerHTML = `
    <div class="h3d${compact ? ' h3d-compact' : ''}${useGL ? ' h3d-gl' : ''}">
      <div class="h3d-stage" tabindex="0" role="img" aria-label="" aria-describedby="${id}-help">
        ${useGL ? '<canvas class="h3d-canvas"></canvas>' : '<div class="h3d-root"></div>'}
      </div>
      ${compact ? '' : `
      <div class="h3d-controls">
        <button type="button" class="btn btn-icon" data-rot="-45" aria-label="${t('render.left')}">${icon('rotl')}</button>
        <label class="h3d-range"><span class="sr-only">${t('render.rotate')}</span>
          <input type="range" min="-180" max="180" step="1" value="${angle}">
        </label>
        <button type="button" class="btn btn-icon" data-rot="45" aria-label="${t('render.right')}">${icon('rotr')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-view="0">${t('render.front')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-view="180">${t('render.back')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-auto aria-pressed="false">${t('render.auto')}</button>
      </div>`}
      <p id="${id}-help" class="sr-only">${t('render.rotate')}: ← →</p>
    </div>`;
  const stage = container.querySelector('.h3d-stage');
  const range = container.querySelector('input[type=range]');
  const autoBtn = container.querySelector('[data-auto]');
  const canvas = container.querySelector('canvas');
  const root = container.querySelector('.h3d-root');

  // WebGL: a dedicated context for the interactive view, a shared one for compact cards.
  let renderer = null, ctx2d = null, parts = null, observer = null;
  if (useGL) {
    try {
      if (compact) { renderer = sharedRenderer(); ctx2d = canvas.getContext('2d'); }
      else renderer = new Renderer(canvas);
    } catch { renderer = null; }
  }
  const draw = () => {
    if (!renderer || !parts) return;
    const w = stage.clientWidth || 300, h = stage.clientHeight || 300;
    const rad = angle * Math.PI / 180;
    if (compact) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      renderer.resize(w, h);
      renderer.setParts(parts);
      renderer.render(rad, { zoom: 1.05 });
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.drawImage(renderer.canvas, 0, 0, canvas.width, canvas.height);
    } else {
      renderer.resize(w, h);
      renderer.render(rad);
    }
  };

  const apply = () => {
    const a = ((angle + 180) % 360 + 360) % 360 - 180;
    if (root) root.style.setProperty('--turn', `${a}deg`);
    if (range) range.value = Math.round(a);
    draw();
  };
  const setAuto = on => {
    auto = on;
    if (autoBtn) autoBtn.setAttribute('aria-pressed', String(on));
    cancelAnimationFrame(raf);
    if (on) {
      last = performance.now();
      const tick = now => { angle += (now - last) * 0.03; last = now; apply(); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }
  };

  let dragging = false, startX = 0, startAngle = 0;
  stage.addEventListener('pointerdown', e => {
    dragging = true; startX = e.clientX; startAngle = angle;
    stage.setPointerCapture(e.pointerId);
    setAuto(false);
  });
  stage.addEventListener('pointermove', e => { if (dragging) { angle = startAngle + (e.clientX - startX) * 0.6; apply(); } });
  const stop = () => { dragging = false; };
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { angle -= 15; apply(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { angle += 15; apply(); e.preventDefault(); }
  });
  container.addEventListener('click', e => {
    const rot = e.target.closest('[data-rot]');
    const view = e.target.closest('[data-view]');
    if (rot) { setAuto(false); angle += +rot.dataset.rot; apply(); }
    if (view) { setAuto(false); angle = +view.dataset.view; apply(); }
    if (e.target.closest('[data-auto]')) setAuto(!auto);
  });
  if (range) range.addEventListener('input', () => { setAuto(false); angle = +range.value; apply(); });
  if (renderer && 'ResizeObserver' in window) {
    observer = new ResizeObserver(() => draw());
    observer.observe(stage);
  }

  const update = (lk, lbl) => {
    if (renderer) {
      parts = buildModel(lk);
      if (!compact) renderer.setParts(parts);
    } else if (root) {
      root.innerHTML = hunterModel(lk);
    }
    stage.setAttribute('aria-label', lbl || label);
    apply();
  };
  update(look, label);
  return {
    update,
    destroy() {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
      if (renderer && !compact) renderer.dispose();
    }
  };
}
