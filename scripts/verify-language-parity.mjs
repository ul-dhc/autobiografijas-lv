import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(path, 'utf8');
const attributes = text => Object.fromEntries([...text.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map(([, name, value]) => [name, value ?? '']));
const features = html => [...html.matchAll(/<(section|button|input|select|details|img)\b([^>]*)>/g)].map(([, tag, text]) => {
  const attrs = attributes(text);
  return [tag, attrs.id ?? '', attrs.class ?? '', attrs.type ?? '', attrs.name ?? '', Object.keys(attrs).filter(key => key.startsWith('data-') && !key.startsWith('data-astro')).sort()];
});
const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
for (const [lv, en] of [['dist/index.html', 'dist/en/index.html'], ['dist/kolekcijas/index.html', 'dist/en/collections/index.html']]) {
  const [latvian, english] = await Promise.all([read(lv), read(en)]);
  assert.deepEqual(features(english), features(latvian), `${en}: sections, images and interactive controls must match Latvian`);
  assert.deepEqual(ids(english), ids(latvian), `${en}: all sections and collection anchors must be available`);
  for (const html of [latvian, english]) {
    for (const [, tag] of html.matchAll(/<a\b([^>]*)>/g)) {
      const attrs = attributes(tag);
      if (/^https?:\/\//.test(attrs.href ?? '')) assert.equal(attrs.target, '_blank', 'External links open in a new tab in both languages');
    }
    const menu = html.match(/<button\b[^>]*data-menu-toggle[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(menu, 'Both languages have the mobile menu');
    assert.ok(!/\bMenu\b|Izvēlne/.test(menu[1]), 'Menu buttons contain icons without visible labels');
  }
}
const data = JSON.parse(await read('src/data/collections.json'));
for (const collection of data.collections) {
  if (collection.title.lv) assert.ok(collection.title.en, `English title missing: ${collection.id}`);
  if (collection.shortDescription.lv) assert.ok(collection.shortDescription.en && collection.shortDescription.en !== collection.shortDescription.lv, `English description missing: ${collection.id}`);
}
const expanded = JSON.parse(await read('src/data/collection-expanded-descriptions.json'));
for (const [id, description] of Object.entries(expanded)) {
  assert.ok(description.lv && description.en, `Expanded description must exist in both languages: ${id}`);
}
console.log('Verified Latvian/English section, control, image and anchor parity; all available descriptions have translations.');
