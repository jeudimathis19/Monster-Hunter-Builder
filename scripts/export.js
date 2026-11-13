'use strict';

/**
 * Exports the SQLite game data to static, localized JSON bundles in /data.
 * The front-end reads these files, so the site also works on static hosting
 * (GitHub Pages) without the Node server.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { LANGS, buildCore, buildText } = require('../lib/bundle');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'data');
const db = new Database(path.join(root, 'monster_hunter.db'), { readonly: true });

fs.mkdirSync(outDir, { recursive: true });
for (const lang of LANGS) {
  for (const [suffix, data] of [['', buildCore(db, lang)], ['-text', buildText(db, lang)]]) {
    const file = path.join(outDir, `${lang}${suffix}.json`);
    fs.writeFileSync(file, JSON.stringify(data));
    console.log(`${path.relative(root, file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
}
db.close();
