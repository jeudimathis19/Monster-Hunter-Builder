// Home: playstyle generator + recommended builds split by Low / High Rank.

import { html, raw, mount, num, setTitle, $ } from '../ui.js';
import { t, WEAPON_KINDS, ELEMENTS, STATUSES, STYLES } from '../i18n.js';
import { icon } from '../icons.js';
import { prefs } from '../store.js';
import { loadFeatured } from '../data.js';
import { computeBuild } from '../calc.js';
import { generateBuilds } from '../generator.js';
import { buildCard } from '../components.js';
import { cardActions, bindCardActions } from './shared.js';

const DEFAULTS = { kind: 'long-sword', rank: 'high', hr: 50, style: 'balanced', element: '', monsterId: '' };

export async function render(el, { data, query }) {
  setTitle('');
  const saved = { ...DEFAULTS, ...prefs.get('generator', {}) };
  const featuredRank = query.get('rank') === 'low' ? 'low' : 'high';

  mount(el, html`
    <section class="hero">
      <div class="container hero-inner">
        <h1 class="hero-title">${t('home.title')}</h1>
        <p class="hero-lead">${t('home.lead')}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" data-scroll="generator">${raw(icon('sword'))}${t('home.cta.generate')}</button>
          <a class="btn" href="#/builder">${raw(icon('edit'))}${t('home.cta.create')}</a>
        </div>
        <p class="hero-stats">${t('home.stats', { w: num(data.weapons.length), a: num(data.armor.length), d: num(data.decorations.length), c: num(data.charms.length), i: num(data.items.length) })}</p>
      </div>
    </section>

    <section class="section" id="generator" aria-labelledby="gen-title">
      <div class="container">
        <div class="section-head"><div>
          <h2 id="gen-title" class="section-title">${t('gen.title')}</h2>
          <p>${t('gen.lead')}</p>
        </div></div>
        <form class="panel form" id="gen-form" novalidate>
          <div class="form-grid">
            <label class="field"><span>${t('gen.weapon')}</span>
              <select name="kind">${WEAPON_KINDS.map(k => html`<option value="${k}" ${k === saved.kind ? raw('selected') : ''}>${t(`weapon.${k}`)}</option>`)}</select>
            </label>
            <fieldset class="field"><legend>${t('gen.rank')}</legend>
              <div class="segmented">
                <input type="radio" id="gr-low" name="rank" value="low" ${saved.rank === 'low' ? raw('checked') : ''}><label for="gr-low">${t('rank.low')}</label>
                <input type="radio" id="gr-high" name="rank" value="high" ${saved.rank !== 'low' ? raw('checked') : ''}><label for="gr-high">${t('rank.high')}</label>
              </div>
            </fieldset>
            <label class="field"><span>${t('gen.hr')}</span>
              <input type="number" name="hr" min="1" max="999" inputmode="numeric" value="${saved.hr}" required>
            </label>
            <label class="field"><span>${t('gen.element')}</span>
              <select name="element">
                <option value="">${t('common.any')}</option>
                <option value="raw" ${saved.element === 'raw' ? raw('selected') : ''}>${t('el.raw')}</option>
                ${[...ELEMENTS, ...STATUSES].map(e => html`<option value="${e}" ${saved.element === e ? raw('selected') : ''}>${t(`el.${e}`)}</option>`)}
              </select>
            </label>
            <label class="field"><span>${t('gen.monster')}</span>
              <select name="monsterId" aria-describedby="gen-monster-hint">
                <option value="">${t('common.none')}</option>
                ${data.monsters.filter(m => m.k === 'large').sort((a, b) => a.n.localeCompare(b.n)).map(m => html`<option value="${m.id}" ${String(m.id) === String(saved.monsterId) ? raw('selected') : ''}>${m.n}</option>`)}
              </select>
              <span class="hint" id="gen-monster-hint">${t('gen.monster.hint')}</span>
            </label>
          </div>
          <fieldset><legend>${t('gen.style')}</legend>
            <div class="style-grid">${STYLES.map(s => html`<div class="style-option">
              <input type="radio" name="style" id="st-${s}" value="${s}" ${s === saved.style ? raw('checked') : ''}>
              <label for="st-${s}"><strong>${t(`style.${s}`)}</strong><span>${t(`style.${s}.d`)}</span></label>
            </div>`)}</div>
          </fieldset>
          <p class="hint" id="gen-lr-hint" ${saved.rank === 'low' ? '' : raw('hidden')}>${t('gen.lowRankCap')}</p>
          <div><button class="btn btn-primary" type="submit">${raw(icon('sword'))}${t('gen.submit')}</button></div>
        </form>
        <div id="gen-results" class="section" aria-live="polite"></div>
      </div>
    </section>

    <section class="section" aria-labelledby="feat-title">
      <div class="container">
        <div class="section-head"><div>
          <h2 id="feat-title" class="section-title">${t('featured.title')}</h2>
          <p>${t('featured.lead')}</p>
        </div>
          <label class="field"><span>${t('featured.filter')}</span>
            <select id="feat-kind"><option value="">${t('common.all')}</option>${WEAPON_KINDS.map(k => html`<option value="${k}">${t(`weapon.${k}`)}</option>`)}</select>
          </label>
        </div>
        <div class="tabs" role="tablist" aria-label="${t('db.rank')}">
          <button class="tab" type="button" role="tab" id="tab-high" aria-controls="feat-panel" aria-selected="${featuredRank === 'high'}" tabindex="${featuredRank === 'high' ? 0 : -1}" data-rank="high">${t('rank.high')}</button>
          <button class="tab" type="button" role="tab" id="tab-low" aria-controls="feat-panel" aria-selected="${featuredRank === 'low'}" tabindex="${featuredRank === 'low' ? 0 : -1}" data-rank="low">${t('rank.low')}</button>
        </div>
        <div id="feat-panel" role="tabpanel" aria-labelledby="tab-${featuredRank}"><div class="skeleton"></div></div>
        <p class="small muted">${t('featured.note')}</p>
      </div>
    </section>`);

  const form = $('#gen-form', el);
  const results = $('#gen-results', el);
  const readForm = () => {
    const f = new FormData(form);
    return {
      kind: f.get('kind'), rank: f.get('rank'), hr: Math.max(1, Math.min(999, parseInt(f.get('hr'), 10) || 1)),
      style: f.get('style') || 'balanced', element: f.get('element') || '', monsterId: f.get('monsterId') || ''
    };
  };
  form.addEventListener('change', e => {
    if (e.target.name === 'rank') $('#gen-lr-hint', el).hidden = e.target.value !== 'low';
  });

  const showGenerated = opts => {
    const list = generateBuilds(opts, data);
    if (!list.length) {
      mount(results, html`<p class="empty">${t('gen.empty')}</p>`);
      return;
    }
    const monster = opts.monsterId ? data.monsterById.get(+opts.monsterId) : null;
    const cards = list.map((g, i) => {
      const c = computeBuild(g.build, data);
      const name = `${t(`weapon.${opts.kind}`)} · ${t(`style.${opts.style}`)}`;
      const sub = [g.ctx.element ? t(`el.${g.ctx.element}`) : null, monster ? monster.n : null].filter(Boolean).join(' · ');
      return buildCard({
        id: `gen-${i}`,
        title: name,
        subtitle: sub,
        tags: html`<span class="badge badge-variant">${t(`gen.variant.${g.variant}`)}</span>`,
        c,
        actions: cardActions({ build: g.build, name: `${name} (${t(`gen.variant.${g.variant}`)})`, style: opts.style, kind: opts.kind })
      });
    });
    mount(results, html`<h3 class="section-title">${t('gen.results')}</h3><div class="grid grid-cards">${cards}</div>`);
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const opts = readForm();
    prefs.set('generator', opts);
    showGenerated(opts);
    results.querySelector('h3')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  bindCardActions(results, data);

  // Recommended builds
  const featured = await loadFeatured();
  const panel = $('#feat-panel', el);
  let rank = featuredRank;
  const kindSel = $('#feat-kind', el);
  const showFeatured = () => {
    const kind = kindSel.value;
    const list = featured.filter(f => f.rank === rank && (!kind || f.kind === kind)).sort((a, b) => a.kind.localeCompare(b.kind) || b.hr - a.hr);
    if (!list.length) { mount(panel, html`<p class="empty">${t('featured.none')}</p>`); return; }
    mount(panel, html`<div class="grid grid-cards">${list.map(f => {
      const c = computeBuild(f.build, data);
      return buildCard({
        id: f.id,
        title: `${t(`weapon.${f.kind}`)} · ${f.name}`,
        subtitle: html`${t(`style.${f.style}`)} · ${t('common.source')} : <a class="source-link" href="${f.url}" target="_blank" rel="noopener noreferrer">${f.source}<span class="sr-only"> (${t('common.open')})</span></a>`,
        tags: '',
        c: { ...c, hr: Math.max(c.hr, f.hr) },
        actions: cardActions({ build: f.build, name: `${t(`weapon.${f.kind}`)} · ${f.name}`, style: f.style, kind: f.kind, favId: f.id })
      });
    })}</div>`);
  };
  el.querySelector('.tabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-rank]');
    if (!tab) return;
    rank = tab.dataset.rank;
    el.querySelectorAll('.tabs .tab').forEach(b => { b.setAttribute('aria-selected', String(b === tab)); b.tabIndex = b === tab ? 0 : -1; });
    panel.setAttribute('aria-labelledby', tab.id);
    showFeatured();
  });
  el.querySelector('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...el.querySelectorAll('.tabs .tab')];
    const i = tabs.indexOf(document.activeElement);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); next.click();
  });
  kindSel.addEventListener('change', showFeatured);
  showFeatured();
  bindCardActions(panel, data);
  el.querySelector('[data-scroll]').addEventListener('click', () => {
    const target = document.getElementById('generator');
    target.scrollIntoView({ behavior: 'smooth' });
    form.querySelector('select').focus({ preventScroll: true });
  });
  if (query.get('gen') === '1') showGenerated(readForm());
}
