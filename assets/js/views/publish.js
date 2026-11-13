// Publish / update dialog for community builds and cosmetic sets.

import { html, raw, openDialog, toast } from '../ui.js';
import { t, getLang, STYLES } from '../i18n.js';
import { icon } from '../icons.js';
import { hasCommunity, publishBuild, updateBuild } from '../api.js';
import { owned } from '../store.js';

/**
 * @param {object} opts { type: 'build'|'cosmetic', build, name, style, editId, existing }
 * @returns Promise<string|null> published id
 */
export async function publishDialog({ type = 'build', build, name = '', style = 'custom', editId = null, existing = {} }) {
  if (!hasCommunity()) {
    toast(t('publish.offline'), 'error');
    return null;
  }
  const isEdit = editId && owned.token(editId);
  const styles = type === 'cosmetic' ? [] : [...STYLES, 'custom'];
  const value = await openDialog(html`
    <form method="dialog" class="publish-form">
      <div class="dialog-head">
        <h2>${t('publish.title')}</h2>
        <button type="button" class="btn btn-icon" data-close="" aria-label="${t('common.close')}">${raw(icon('x'))}</button>
      </div>
      <div class="dialog-body form">
        <label class="field"><span>${t('publish.name')} *</span>
          <input type="text" name="name" maxlength="60" required value="${existing.name || name}"></label>
        <label class="field"><span>${t('publish.author')}</span>
          <input type="text" name="author" maxlength="32" autocomplete="nickname" value="${existing.author || ''}"></label>
        ${styles.length ? html`<label class="field"><span>${t('publish.style')}</span><select name="playstyle">
          ${styles.map(s => html`<option value="${s}" ${s === (existing.playstyle || style) ? raw('selected') : ''}>${t(`style.${s}`)}</option>`)}</select></label>` : ''}
        <label class="field"><span>${t('publish.description')}</span>
          <textarea name="description" maxlength="1000">${existing.description || ''}</textarea></label>
        <p class="form-error alert" role="alert" hidden></p>
        <div class="builder-actions">
          <button class="btn btn-primary" type="submit" value="ok">${isEdit ? t('publish.update') : t('publish.submit')}</button>
          <button class="btn" type="button" data-close="">${t('common.cancel')}</button>
        </div>
      </div>
    </form>`, {
    label: t('publish.title'),
    onMount(dlg) {
      dlg.classList.add('dialog-small');
      const form = dlg.querySelector('form');
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(form);
        const payload = {
          type, build, lang: getLang(),
          name: f.get('name'), author: f.get('author'), description: f.get('description'),
          playstyle: f.get('playstyle') || (type === 'cosmetic' ? 'custom' : style)
        };
        const err = form.querySelector('.form-error');
        const btn = form.querySelector('[type=submit]');
        btn.disabled = true;
        try {
          const res = isEdit ? await updateBuild(editId, payload) : await publishBuild(payload);
          dlg.close(res.id);
        } catch (ex) {
          err.hidden = false;
          err.textContent = t('publish.error', { msg: ex.message });
          btn.disabled = false;
        }
      });
    }
  });
  if (value) toast(isEdit ? t('publish.updated') : t('publish.ok'), 'success');
  return value || null;
}
