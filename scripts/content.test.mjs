import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const load=async name=>JSON.parse(await readFile(new URL(`../src/data/${name}.json`,import.meta.url),'utf8'));
test('diary choices identify distinct readable source files',async()=>{
 const entries=await load('pudelis-examples');
 assert.equal(new Set(entries.map(x=>x.file)).size,entries.length);
 for(const entry of entries){
  assert.ok(entry.transcript.trim().length>0 && entry.date_lv && entry.date_en);
  await readFile(new URL(`../src/assets/${entry.file}`,import.meta.url));
 }
});
test('dataset citations retain a resolvable repository identifier and complete metadata',async()=>{
 for(const ref of await load('dataset-references')){
  assert.ok(ref.authors && ref.title && ref.publisher && Number.isInteger(ref.year));
  assert.equal(new URL(ref.handle).hostname,'hdl.handle.net');
  assert.ok(new URL(ref.source).pathname.endsWith(new URL(ref.handle).pathname));
 }
});
