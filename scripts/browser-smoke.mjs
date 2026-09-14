import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.argv[2]);
const context = vm.createContext({});
const modules = new Map();
async function load(file) {
  const absolute = resolve(file);
  assert.ok(!relative(root, absolute).startsWith('..'), 'browser graph stays inside packed ESM');
  if (modules.has(absolute)) return modules.get(absolute);
  const mod = new vm.SourceTextModule(await readFile(absolute, 'utf8'), { context, identifier: absolute });
  modules.set(absolute, mod);
  await mod.link(async (specifier, referring) => {
    assert.ok(specifier.startsWith('./'), 'runtime only imports its own relative modules');
    return load(resolve(dirname(referring.identifier), specifier));
  });
  return mod;
}
const entry = await load(resolve(root, 'index.js'));
await entry.evaluate();
assert.equal(vm.runInContext('[typeof process, typeof require, typeof Buffer, typeof window, typeof document].join(",")', context), 'undefined,undefined,undefined,undefined,undefined');
const current = { subject: { kind: 'node', id: '1' }, predicate: 'status', stratum: 'asserted', provenance: 'browser' };
assert.equal(entry.namespace.conflictsOf([{ ...current, value: 'up' }, { ...current, value: 'down' }]).length, 1);
console.log('Packed browser-neutral ESM graph passed without Node or DOM globals.');
