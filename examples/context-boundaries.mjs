import assert from 'node:assert/strict';
import { assertionKey, conflictsOf } from '../dist/esm/index.js';

// Host adapter: retrieve an authorized reference, validate its schema and units,
// and stamp this scope from the current source. No table is sent to a model.
const scope = {
  subject: { kind: 'node', id: 'cluster-a/node-11' },
  predicate: 'latency_ms', epoch: 3, stratum: 'asserted',
};
const evidence = { ...scope, value: 12, provenance: 'source:owned-result-7' };

// Before a model call: check the compact current context against that evidence.
const prepared = { ...scope, value: 12, provenance: 'prepared context' };
const history = { ...scope, value: 8, stratum: 'quoted', provenance: 'earlier turn' };
assert.deepEqual(conflictsOf([evidence, prepared, history]), []);
assert.equal(conflictsOf([evidence, { ...prepared, value: 20 }]).length, 1);

// After a model call: this tiny HOST policy accepts one structured measurement.
// The model cannot choose a different subject, version or provenance to evade it.
// A real adapter also checks reference ownership and the operation's coverage.
function checkMeasurement(output, source) {
  if (!output || Object.keys(output).length !== 2 ||
      output.nodeId !== scope.subject.id ||
      typeof output.latencyMs !== 'number' || !Number.isFinite(output.latencyMs)) {
    return { status: 'not-checked', reason: 'Expected this node and a finite latencyMs.' };
  }
  if (!source || assertionKey(source) !== assertionKey(evidence) || source.stratum !== 'asserted' ||
      typeof source.value !== 'number' || !Number.isFinite(source.value)) {
    return { status: 'not-checked', reason: 'Current latency evidence is unavailable.' };
  }
  const proposed = { ...scope, value: output.latencyMs, provenance: 'structured model claim' };
  const conflicts = conflictsOf([source, proposed]);
  if (conflicts.length) return { status: 'failed', conflicts };
  // Render the value from the checked evidence, not from free-form model prose.
  return { status: 'passed', text: `${source.subject.id} has a reported latency of ${source.value} ms.` };
}

const correct = { nodeId: scope.subject.id, latencyMs: 12 };
assert.equal(checkMeasurement(correct, evidence).status, 'passed');
assert.equal(checkMeasurement({ ...correct, latencyMs: 20 }, evidence).status, 'failed');
assert.equal(checkMeasurement({ ...correct, nodeId: 'other-node' }, evidence).status, 'not-checked');
assert.equal(checkMeasurement(correct, undefined).status, 'not-checked');
assert.equal(checkMeasurement(correct, { ...evidence, value: { kind: 'unknown' } }).status, 'not-checked');
assert.equal(checkMeasurement(correct, { ...evidence, epoch: 2 }).status, 'not-checked');
assert.equal(checkMeasurement(correct, { ...evidence, stratum: 'quoted' }).status, 'not-checked');
console.log('Host boundary example: matching claim passed, conflicting claim failed, missing evidence was not checked.');
