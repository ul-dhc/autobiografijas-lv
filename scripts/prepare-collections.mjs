import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Converts browser-observed source snapshots into catalogue data. No network calls.
const root = new URL('../', import.meta.url);
const date = process.argv[2] ?? '2026-10-14';
assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
const sourceDir = new URL('docs/collections/', root);
const read = async name => JSON.parse(await readFile(new URL(name, sourceDir), 'utf8'));
const [lv, en, details] = await Promise.all([
  read(`garamantas-list-lv-${date}.json`),
  read(`garamantas-list-en-${date}.json`),
  read(`garamantas-details-lv-${date}.json`),
]);
const languageOverrides = await read('language-overrides.json');
const workbookSupplement = await read('workbook-public-supplement.json');
const contentCorrections = await read('public-content-corrections.json');
const clean = value => (value ?? '').replace(/\u00a0/g, ' ').trim();
const idOf = url => {
  const parsed = new URL(url);
  assert.equal(parsed.hostname, 'garamantas.lv');
  const match = parsed.pathname.match(/^\/(?:lv|en)\/collection\/(\d+)(?:\/|$)/);
  assert.ok(match, `Invalid collection URL: ${url}`);
  return match[1];
};
const indexById = rows => {
  const map = new Map();
  for (const row of rows) {
    assert.equal(row.cells.length, 12, 'Unexpected source table columns');
    const id = idOf(row.cells[6].links[0].url);
    assert.ok(!map.has(id), `Duplicate collection: ${id}`);
    map.set(id, row);
  }
  return map;
};
const lvById = indexById(lv.rows);
const enById = indexById(en.rows);
assert.equal(lvById.size, 241, 'The reviewed source snapshot contains 241 collections');
assert.deepEqual([...lvById.keys()].sort(), [...enById.keys()].sort());
const detailsById = new Map(details.collections.map(item => [item.id, item]));
assert.equal(detailsById.size, details.collections.length, 'Duplicate detail records');
for (const item of details.collections) {
  assert.ok(lvById.has(item.id), `Detail without index entry: ${item.id}`);
  assert.equal(item.id, idOf(item.source));
  assert.equal(clean(item.title), clean(lvById.get(item.id).cells[6].text));
  assert.ok(!item.metadata.some(field => field.label === 'Apraksts'), 'Full descriptions excluded');
}
const linkList = cell => cell.links.filter(link => clean(link.text)).map(link => ({
  name: clean(link.text), url: link.url,
}));
const tabCount = (item, href) => {
  const text = item?.tabs.find(tab => tab.href === href)?.label;
  const match = text?.match(/\((\d+)\)/);
  return match ? Number(match[1]) : null;
};
const collections = [...lvById].map(([id, row]) => {
  const english = enById.get(id);
  const detail = detailsById.get(id);
  const shortLv = clean(row.cells[7].text);
  const shortEn = clean(english.cells[7].text);
  const identicalDescription = Boolean(shortEn && shortEn === shortLv);
  const englishViewDescriptionIsLatvian = identicalDescription || languageOverrides[id]?.englishViewDescriptionLanguage === 'lv';
  const titleLv = clean(row.cells[6].text);
  const titleEn = clean(english.cells[6].text);
  const number = clean(row.cells[1].text);
  assert.match(number, /^\d+$/);
  const fileText = clean(row.cells[9].text);
  assert.match(fileText, /^\d+$/);
  const gallery = [...new Map((detail?.gallery ?? []).map(image => [image.url, image])).values()];
  return {
    id,
    number,
    reference: `${clean(row.cells[2].text)} ${number}`,
    title: { lv: titleLv, en: titleEn },
    shortDescription: { lv: shortLv || null, en: englishViewDescriptionIsLatvian ? null : shortEn || null },
    sourceLanguageNotes: {
      englishTitleIdenticalToLatvian: titleEn === titleLv,
      englishDescriptionIdenticalToLatvian: identicalDescription,
      englishViewDescriptionIsLatvian,
    },
    languages: clean(row.cells[4].text).split(',').map(clean).filter(Boolean),
    year: clean(row.cells[5].text) || null,
    institutions: linkList(row.cells[3]),
    submitters: linkList(row.cells[8]),
    personsByRole: detail?.persons ?? [],
    counts: {
      files: Number(fileText),
      units: tabCount(detail, '#units'),
      illustrations: tabCount(detail, '#illustrations'),
      persons: tabCount(detail, '#persons'),
    },
    imageCandidates: gallery,
    coverImage: null,
    metadata: detail?.metadata ?? [],
    access: { status: 'unverified', evidence: null },
    acceptsContributions: id === '1415829',
    source: {
      lv: row.cells[6].links[0].url,
      en: english.cells[6].links[0].url,
      retrievedOn: date,
      session: 'authenticated',
      detailCollected: Boolean(detail),
    },
  };
});

const summary = {
  collections: collections.length,
  shortDescriptionsLv: collections.filter(c => c.shortDescription.lv).length,
  distinctDescriptionsInEnglishView: collections.filter(c => c.shortDescription.en).length,
  englishViewRepeatsLatvianDescription: collections.filter(c => c.sourceLanguageNotes.englishDescriptionIdenticalToLatvian).length,
  englishViewContainsLatvianDescription: collections.filter(c => c.sourceLanguageNotes.englishViewDescriptionIsLatvian).length,
  missingShortDescription: collections.filter(c => !c.shortDescription.lv).length,
  detailsCollected: collections.filter(c => c.source.detailCollected).length,
  collectionsWithImageCandidates: collections.filter(c => c.imageCandidates.length).length,
  collectionsWithPersonsByRole: collections.filter(c => c.personsByRole.some(group => group.people.length)).length,
  accessUnverified: collections.filter(c => c.access.status === 'unverified').length,
};
// Public output uses an explicit allowlist. Technical/provenance fields stay in docs.
const publicCollections = collections.map(collection => {
  const supplement = workbookSupplement[collection.number];
  // A logged-in person tab can reveal a fuller identity than the public index.
  // Only repeat names already identified in the index title or description.
  const stem = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/(?:is|as|es|s|a|e|i|u)$/, '');
  const publicWords = [collection.title.lv, collection.shortDescription.lv ?? ''].join(' ').match(/\p{L}+/gu)?.map(stem) ?? [];
  const publicName = name => {
    const parts = name.match(/\p{L}+/gu)?.map(stem) ?? [];
    return parts.length > 0 && parts.every(part => part.length >= 3 && publicWords.includes(part));
  };
  const authors = [...new Set(collection.personsByRole
    .filter(group => ['Autors', 'Pierakstītājs'].includes(group.role))
    .flatMap(group => group.people.map(person => person.name)).filter(publicName))];
  const image = collection.imageCandidates[0];
  return {
    id: collection.id,
    number: collection.number,
    reference: collection.reference,
    title: collection.title,
    shortDescription: collection.shortDescription,
    languages: collection.languages,
    writingPeriod: contentCorrections[collection.id]?.writingPeriod ?? supplement?.writingPeriod ?? { start: null, end: null },
    materialTypes: supplement?.materialTypes ?? [],
    authors,
    submitters: supplement?.confirmedSubmitters ?? [],
    image: image ? { url: image.url, alt: `Attēls no kolekcijas “${collection.title.lv}”` } : null,
    garamantasUrl: { lv: collection.source.lv, en: collection.source.en },
  };
});
const allowedKeys = ['id', 'number', 'reference', 'title', 'shortDescription', 'languages',
  'writingPeriod', 'materialTypes', 'authors', 'submitters', 'image', 'garamantasUrl'];
for (const collection of publicCollections) {
  assert.deepEqual(Object.keys(collection), allowedKeys);
  assert.ok(!/@/.test(JSON.stringify(collection)), 'No email addresses in public output');
}
const catalogue = { collections: publicCollections };
const output = new URL('src/data/collections.json', root);
await writeFile(output, `${JSON.stringify(catalogue, null, 2)}\n`);
const progress = {
  retrievedOn: date,
  summary,
  publicExport: {
    allowedFields: allowedKeys,
    confirmedSubmitters: publicCollections.filter(c => c.submitters.length).length,
    withWritingPeriod: publicCollections.filter(c => c.writingPeriod.start || c.writingPeriod.end).length,
    withMaterialTypes: publicCollections.filter(c => c.materialTypes.length).length,
    withAuthors: publicCollections.filter(c => c.authors.length).length,
  },
  remainingDetailIds: collections.filter(c => !c.source.detailCollected).map(c => c.id),
  lastErrors: details.errors,
  notes: [
    'Short descriptions only; missing descriptions remain null.',
    'English view may repeat Latvian. Identical descriptions are not counted as English translations.',
    'Image candidates are source URLs. Cover selection and image downloads have not been performed.',
    'Authenticated browsing does not establish anonymous public access. File counts are not access evidence.',
    'Contribution invitation applies only to Pandemic diaries, per user instruction.',
  ],
};
await writeFile(new URL('collection-progress.json', sourceDir), `${JSON.stringify(progress, null, 2)}\n`);
console.log(JSON.stringify({ output: fileURLToPath(output), ...summary }, null, 2));
