import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const data = JSON.parse(await readFile('src/data/collections.json', 'utf8'));
const base = ('/' + (process.env.BASE_PATH || '/').replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
const expectedFields = ['id', 'number', 'reference', 'title', 'shortDescription', 'languages', 'writingPeriod', 'materialTypes', 'authors', 'submitters', 'image', 'garamantasUrl'];
assert.equal(data.collections.length, 241);
assert.equal(new Set(data.collections.map(c => c.id)).size, 241);
const corroboration = JSON.parse(await readFile('docs/collections/workbook-public-supplement.json', 'utf8'));
for (const collection of data.collections) {
  assert.deepEqual(Object.keys(collection), expectedFields, 'Public schema excludes private and technical fields');
  assert.deepEqual(collection.submitters, corroboration[collection.number]?.confirmedSubmitters ?? []);
}
assert.deepEqual(data.collections.find(c => c.id === '1119255').authors, [], 'An unnamed collection must not reveal an identity from authenticated metadata');
assert.deepEqual(data.collections.find(c => c.id === '1153249').authors, [], 'A first-name-only collection must not reveal a fuller identity');
const pages = ['kolekcijas/index.html', 'en/collections/index.html', ...data.collections.flatMap(c => [`kolekcijas/${c.id}/index.html`, `en/collections/${c.id}/index.html`])];
for (const page of pages) {
  const html = await readFile(resolve('dist', page), 'utf8');
  const english = page.startsWith('en/');
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, page);
  assert.ok(html.includes(`lang="${english ? 'en' : 'lv'}"`), page);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, page);
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (url.startsWith('#')) { assert.ok(ids.includes(url.slice(1)), `${page}: ${url}`); continue; }
    if (/^(?:https?:|mailto:|data:)/.test(url)) continue;
    assert.ok(url.startsWith(base), `${page}: ${url}`);
    let file = decodeURI(url.slice(base.length)).split(/[?#]/)[0];
    if (!file || file.endsWith('/')) file += 'index.html';
    await access(resolve('dist', file));
  }
}
for (const page of pages.slice(0, 2)) {
  const html = await readFile(resolve('dist', page), 'utf8');
  assert.equal((html.match(/\sdata-catalogue-card(?:\s|=|>)/g) || []).length, 241, 'Every collection is available without JavaScript');
}
console.log(`Verified ${pages.length} catalogue pages, local links, language metadata and public data restrictions.`);
