import assert from 'node:assert/strict';
import { conflictsOf } from '../dist/esm/index.js';

const basis = {
  subject: { kind: 'node', id: 'cluster-a/node-11' }, predicate: 'status',
  epoch: 3, stratum: 'asserted',
};
const inventory = { ...basis, value: 'up', provenance: 'current inventory' };
const selected = { ...basis, value: 'down', provenance: 'current selected record' };
const history = { ...basis, value: 'maintenance', stratum: 'quoted', provenance: 'earlier conversation' };
const conflicts = conflictsOf([inventory, history, selected]);
assert.equal(conflicts.length, 1);
assert.deepEqual(conflicts[0].assertions, [inventory, selected]);
console.log('Compared current status: one conflict; quoted history does not participate.');
