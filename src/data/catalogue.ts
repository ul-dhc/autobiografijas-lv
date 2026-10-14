import data from './collections.json';
import { localUrl, type Lang } from './urls';
import { collectionSlug } from './collection-slug.mjs';

export const catalogue = data.collections;
export type ArchiveCollection = (typeof catalogue)[number];
export const cataloguePath = (lang: Lang) => lang === 'en' ? 'en/collections/' : 'kolekcijas/';
export const catalogueUrl = (lang: Lang) => localUrl(cataloguePath(lang));
export const collectionPath = (collection: ArchiveCollection, lang: Lang) => `${cataloguePath(lang)}${collection.id}/${collectionSlug(collection.title[lang] || collection.title.lv)}/`;
export const collectionUrl = (id: string, lang: Lang) => {
  const collection = catalogue.find(item => item.id === id);
  if (!collection) throw new Error(`Unknown collection: ${id}`);
  return localUrl(collectionPath(collection, lang));
};
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('lv').replace(/\s+/g, ' ').trim();
export const searchText = (collection: ArchiveCollection) => normalizeSearch([
  collection.reference, ...Object.values(collection.title),
  ...Object.values(collection.shortDescription), ...collection.authors, ...collection.submitters,
].filter(Boolean).join(' '));
export const materialLabels: Record<string, Record<Lang, string>> = {
  diary: { lv: 'Dienasgrāmatas', en: 'Diaries' },
  autobiography: { lv: 'Dzīvesstāsti un atmiņas', en: 'Life stories and memoirs' },
  letters: { lv: 'Vēstules', en: 'Letters' },
};
export const periodLabel = (collection: ArchiveCollection, lang: Lang) => {
  const { start, end } = collection.writingPeriod;
  if (start && end) return start === end ? String(start) : `${start}–${end}`;
  if (start) return `${lang === 'en' ? 'From' : 'No'} ${start}`;
  if (end) return `${lang === 'en' ? 'Until' : 'Līdz'} ${end}`;
  return '';
};
export const localizedText = (text: { lv: string | null; en: string | null }, lang: Lang) => {
  if (lang === 'en' && text.en && text.en !== text.lv) return { text: text.en, lang: 'en' };
  return { text: text.lv || text.en || '', lang: text.lv ? 'lv' : 'en' };
};
