// Account page: sign in, sign up, password reset, profile and account deletion.

import { html, raw, mount, toast, openDialog, setTitle, $ } from '../ui.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { favorites } from '../store.js';
import {
  authEnabled, currentUser, isSignedIn, signIn, signUp, signOut, requestPasswordReset,
  updatePassword, setUsername, AuthError
} from '../auth.js';
import { usernameAvailable, updateUsername, deleteMyAccount, myBuilds } from '../api.js';
import { syncAccount } from '../sync.js';

const USERNAME = /^[A-Za-z0-9_-]{3,24}$/;

function errorText(err) {
  const code = err instanceof AuthError ? err.code : '';
  const key = `acc.err.${code}`;
  const msg = t(key);
  return msg === key ? t('acc.err.generic', { msg: err.message || code }) : msg;
}

export async function render(el, { query, rerender }) {
  setTitle(t('acc.title'));
  const hero = html`<div class="page-hero"><div class="container"><h1>${t('acc.title')}</h1><p>${t('acc.lead')}</p></div></div>`;

  if (!authEnabled()) {
    mount(el, html`${hero}<div class="container page"><p class="alert alert-info">${t('acc.disabled')}</p></div>`);
    return;
  }

  const notice = query.get('error') ? html`<p class="alert" role="alert">${errorText(new AuthError(query.get('error')))}</p>` : '';

  // ---------------------------------------------------------------- Signed out
  if (!isSignedIn()) {
    const mode = query.get('mode') === 'signup' ? 'signup' : query.get('mode') === 'forgot' ? 'forgot' : 'signin';
    const tab = (m, label) => html`<a class="tab" href="#/account?mode=${m}" ${m === mode ? raw('aria-current="page"') : ''}>${label}</a>`;
    mount(el, html`${hero}
      <div class="container page">
        <div class="account-box panel">
          ${notice}
          <nav class="tabs" aria-label="${t('acc.title')}">${tab('signin', t('acc.signin'))}${tab('signup', t('acc.signup'))}</nav>
          ${mode === 'signin' ? html`
            <form class="form" id="acc-form" data-mode="signin">
              <label class="field"><span>${t('acc.email')}</span><input type="email" name="email" autocomplete="email" required></label>
              <label class="field"><span>${t('acc.password')}</span><input type="password" name="password" autocomplete="current-password" required minlength="6"></label>
              <p class="form-error alert" role="alert" hidden></p>
              <div class="builder-actions"><button class="btn btn-primary" type="submit">${t('acc.signin')}</button>
                <a class="btn btn-ghost" href="#/account?mode=forgot">${t('acc.forgot')}</a></div>
            </form>` : ''}
          ${mode === 'signup' ? html`
            <form class="form" id="acc-form" data-mode="signup">
              <label class="field"><span>${t('acc.username')}</span>
                <input type="text" name="username" autocomplete="nickname" required pattern="[A-Za-z0-9_\\-]{3,24}" maxlength="24" aria-describedby="acc-user-hint">
                <span class="hint" id="acc-user-hint">${t('acc.usernameHint')}</span></label>
              <label class="field"><span>${t('acc.email')}</span><input type="email" name="email" autocomplete="email" required></label>
              <label class="field"><span>${t('acc.password')}</span>
                <input type="password" name="password" autocomplete="new-password" required minlength="8" aria-describedby="acc-pw-hint">
                <span class="hint" id="acc-pw-hint">${t('acc.passwordHint')}</span></label>
              <p class="form-error alert" role="alert" hidden></p>
              <p class="small muted">${t('acc.syncNote')}</p>
              <div class="builder-actions"><button class="btn btn-primary" type="submit">${t('acc.signup')}</button></div>
            </form>` : ''}
          ${mode === 'forgot' ? html`
            <form class="form" id="acc-form" data-mode="forgot">
              <label class="field"><span>${t('acc.email')}</span><input type="email" name="email" autocomplete="email" required></label>
              <p class="form-error alert" role="alert" hidden></p>
              <div class="builder-actions"><button class="btn btn-primary" type="submit">${t('acc.reset')}</button>
                <a class="btn btn-ghost" href="#/account">${t('acc.signin')}</a></div>
            </form>` : ''}
        </div>
      </div>`);

    const form = $('#acc-form', el);
    const err = form.querySelector('.form-error');
    const fail = e => { err.hidden = false; err.textContent = typeof e === 'string' ? e : errorText(e); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(form);
      const btn = form.querySelector('[type=submit]');
      err.hidden = true;
      btn.disabled = true;
      try {
        if (form.dataset.mode === 'signin') {
          await signIn(String(f.get('email')).trim(), String(f.get('password')));
          await syncAccount();
          toast(t('acc.welcome', { name: currentUser().username }), 'success');
          rerender();
        } else if (form.dataset.mode === 'signup') {
          const username = String(f.get('username')).trim();
          if (!USERNAME.test(username)) { fail(t('acc.usernameHint')); return; }
          if (!(await usernameAvailable(username))) { fail(t('acc.usernameTaken')); return; }
          const res = await signUp(String(f.get('email')).trim(), String(f.get('password')), username);
          if (res.confirmed) {
            await syncAccount();
            toast(t('acc.welcome', { name: currentUser().username }), 'success');
            rerender();
          } else {
            mount(form, html`<p class="alert alert-info" role="status">${t('acc.confirmSent')}</p>`);
          }
        } else {
          await requestPasswordReset(String(f.get('email')).trim());
          mount(form, html`<p class="alert alert-info" role="status">${t('acc.resetSent')}</p>`);
        }
      } catch (ex) {
        fail(ex);
      } finally {
        btn.disabled = false;
      }
    });
    form.querySelector('input')?.focus();
    return;
  }

  // ---------------------------------------------------------------- Signed in
  const user = currentUser();
  const resetMode = query.get('reset') === '1';
  if (query.get('welcome') === '1') toast(t('acc.welcome', { name: user.username }), 'success');
  let creations = [];
  try { creations = await myBuilds(); } catch { creations = []; }
  const favCount = favorites.all().length;

  mount(el, html`${hero}
    <div class="container page">
      ${notice}
      <div class="grid grid-2">
        ${resetMode ? html`<section class="panel" aria-labelledby="acc-reset-t">
          <h2 id="acc-reset-t" class="panel-title">${t('acc.resetTitle')}</h2>
          <form class="form" id="acc-reset">
            <label class="field"><span>${t('acc.newPassword')}</span><input type="password" name="password" autocomplete="new-password" required minlength="8"></label>
            <p class="form-error alert" role="alert" hidden></p>
            <div><button class="btn btn-primary" type="submit">${t('common.save')}</button></div>
          </form></section>` : ''}
        <section class="panel" aria-labelledby="acc-profile-t">
          <h2 id="acc-profile-t" class="panel-title">${t('acc.signedAs')}</h2>
          <p class="account-name">${raw(icon('user', { size: 22 }))} <strong>${user.username}</strong> <span class="muted small">${user.email}</span></p>
          <form class="form" id="acc-username">
            <label class="field"><span>${t('acc.username')}</span>
              <input type="text" name="username" value="${user.username}" required pattern="[A-Za-z0-9_\\-]{3,24}" maxlength="24" aria-describedby="acc-user-hint2">
              <span class="hint" id="acc-user-hint2">${t('acc.usernameHint')}</span></label>
            <p class="form-error alert" role="alert" hidden></p>
            <div class="builder-actions"><button class="btn" type="submit">${t('common.save')}</button>
              <button class="btn btn-ghost" type="button" data-signout>${t('acc.signout')}</button></div>
          </form>
        </section>
        <section class="panel" aria-labelledby="acc-mine-t">
          <h2 id="acc-mine-t" class="panel-title">${t('fav.title')}</h2>
          <dl class="stats-grid">
            <div><dt>${t('acc.myFavorites')}</dt><dd>${favCount}</dd></div>
            <div><dt>${t('acc.myCreations')}</dt><dd>${creations.length}</dd></div>
          </dl>
          ${creations.length ? html`<ul class="monster-list section">${creations.slice(0, 8).map(b => html`<li>
            <a href="#/${b.type === 'cosmetic' ? 'cosmetic' : 'build'}/${b.id}"><strong>${b.name}</strong></a>
            <span class="muted small">${t('discover.likes', { n: b.likes })} · ${t('discover.views', { n: b.views })}</span></li>`)}</ul>` : ''}
          <p><a class="btn btn-primary" href="#/favorites">${t('fav.title')}</a></p>
        </section>
        <section class="panel" aria-labelledby="acc-sec-t">
          <h2 id="acc-sec-t" class="panel-title">${t('acc.security')}</h2>
          ${resetMode ? '' : html`<form class="form" id="acc-password">
            <label class="field"><span>${t('acc.newPassword')}</span><input type="password" name="password" autocomplete="new-password" required minlength="8"></label>
            <p class="form-error alert" role="alert" hidden></p>
            <div><button class="btn" type="submit">${t('acc.changePassword')}</button></div>
          </form>`}
          <p class="section"><button class="btn btn-ghost btn-danger" type="button" data-delete-account>${raw(icon('trash', { size: 16 }))}${t('acc.danger')}</button></p>
        </section>
      </div>
    </div>`);

  const bindForm = (sel, fn) => {
    const form = $(sel, el);
    if (!form) return;
    const err = form.querySelector('.form-error');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true;
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try { await fn(new FormData(form), form); }
      catch (ex) { err.hidden = false; err.textContent = ex instanceof AuthError ? errorText(ex) : ex.message; }
      finally { btn.disabled = false; }
    });
  };
  const passwordForm = async (f, form) => {
    await updatePassword(String(f.get('password')));
    form.reset();
    toast(t('acc.passwordSaved'), 'success');
    if (resetMode) location.hash = '#/account';
  };
  bindForm('#acc-reset', passwordForm);
  bindForm('#acc-password', passwordForm);
  bindForm('#acc-username', async f => {
    const name = String(f.get('username')).trim();
    if (!USERNAME.test(name)) throw new Error(t('acc.usernameHint'));
    if (name === user.username) return;
    try { await updateUsername(name); }
    catch (ex) { throw new Error(/taken/i.test(ex.message) ? t('acc.usernameTaken') : ex.message); }
    setUsername(name);
    toast(t('acc.usernameSaved'), 'success');
    rerender();
  });
  el.querySelector('[data-signout]').addEventListener('click', async () => {
    await signOut();
    rerender();
  });
  el.querySelector('[data-delete-account]').addEventListener('click', async () => {
    const v = await openDialog(html`<div class="dialog-body"><p>${t('acc.deleteConfirm')}</p>
      <div class="builder-actions"><button type="button" class="btn btn-danger" data-close="ok">${t('acc.danger')}</button>
      <button type="button" class="btn" data-close="">${t('common.cancel')}</button></div></div>`, { label: t('acc.danger'), onMount: d => d.classList.add('dialog-small') });
    if (v !== 'ok') return;
    try {
      await deleteMyAccount();
      await signOut();
      toast(t('acc.deleted'), 'success');
      rerender();
    } catch (ex) { toast(ex.message, 'error'); }
  });
  if (resetMode) $('#acc-reset input', el)?.focus();
}
