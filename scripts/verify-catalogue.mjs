import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectionSlug } from '../src/data/collection-slug.mjs';
const data = JSON.parse(await readFile('src/data/collections.json', 'utf8'));
const manuscriptImages = JSON.parse(await readFile('src/data/manuscript-images.json', 'utf8'));
const base = ('/' + (process.env.BASE_PATH || '/').replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
const expectedFields = ['id', 'number', 'reference', 'title', 'shortDescription', 'languages', 'writingPeriod', 'materialTypes', 'authors', 'submitters', 'image', 'garamantasUrl'];
assert.equal(data.collections.length, 241);
assert.equal(new Set(data.collections.map(c => c.id)).size, 241);
const corroboration = JSON.parse(await readFile('docs/collections/workbook-public-supplement.json', 'utf8'));
for (const collection of data.collections) {
  assert.deepEqual(Object.keys(collection), expectedFields, 'Public schema excludes private and technical fields');
  assert.deepEqual(collection.submitters, corroboration[collection.number]?.confirmedSubmitters ?? []);
  assert.equal(collection.image?.url ?? null, manuscriptImages[collection.id]?.url ?? null, 'Covers use verified public manuscript pages');
  if (collection.image) {
    assert.equal(new URL(collection.image.url).hostname, 'media.garamantas.lv');
    assert.ok(!/-t\./.test(collection.image.url), 'Cover uses the manuscript image rather than its thumbnail');
    assert.equal(collection.image.alt, `Manuskripta pirmā lapa: ${collection.title.lv}`);
  }
}
assert.deepEqual(data.collections.find(c => c.id === '1119255').authors, [], 'An unnamed collection must not reveal an identity from authenticated metadata');
assert.deepEqual(data.collections.find(c => c.id === '1153249').authors, [], 'A first-name-only collection must not reveal a fuller identity');
assert.equal(collectionSlug('Ādama Purmaļa dzīvesstāsts'), 'Adama-Purmala-dzivesstasts');
const pages = ['kolekcijas/index.html', 'en/collections/index.html'];
for (const folder of ['dist/kolekcijas', 'dist/en/collections']) {
  assert.deepEqual(await readdir(folder), ['index.html'], 'Only catalogue pages are generated; collections use hash links');
}
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
  assert.equal((html.match(/<details\s/g) || []).length, 241, 'Each collection opens in the catalogue');
  for (const collection of data.collections) {
    const anchor = `LFKAk${collection.number}-${collectionSlug(collection.title.lv)}`;
    assert.ok(html.includes(`id="${anchor}"`), 'Every collection has its share anchor');
    assert.ok(html.includes(`#${anchor}"`), 'Every collection has a hash share link');
  }
}
console.log(`Verified ${pages.length} catalogue pages, local links, language metadata and public data restrictions.`);
