import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('dist');
const base = ('/' + (process.env.BASE_PATH || '/').replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
for (const page of ['index.html', 'en/index.html']) {
  const html = await readFile(resolve(root,page),'utf8');
  assert.match(html, new RegExp(`<html[^>]*lang="${page.startsWith('en') ? 'en' : 'lv'}"`));
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1, `${page}: one main title`);
  assert.ok(!html.includes('—'),`${page}: use en dashes`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size, ids.length,`${page}: unique IDs`);
  assert.match(html,/data-diary-step/);
  assert.match(html,/20\.500\.12574\/48/);
  assert.match(html,/20\.500\.12574\/145/);
  const links=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
  const candidates=[...links,...[...html.matchAll(/srcset="([^"]+)"/g)].flatMap(m=>m[1].split(',').map(x=>x.trim().split(/\s/)[0]))];
  for (const url of candidates) {
    if (url.startsWith('#')) { assert.ok(ids.includes(url.slice(1)),`Missing anchor ${url}`); continue; }
    if (/^(https?:|mailto:|data:)/.test(url)) continue;
    assert.ok(url.startsWith(base),`${page}: ${url} must start with ${base}`);
    let file=decodeURI(url.slice(base.length)).split(/[?#]/)[0];
    if (!file || file.endsWith('/')) file+='index.html';
    await access(resolve(root,file));
  }
  assert.ok(!html.includes('research.html') && !html.includes('Dizaina makets'));
}
console.log(`LV/EN HTML, anchors, images and asset links verified for ${base}`);
