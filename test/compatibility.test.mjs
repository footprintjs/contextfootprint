import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../dist/esm/index.js';

const assertion = (value, extra = {}) => ({
  subject: { kind: 'entity', id: 'node/11' },
  predicate: 'latency',
  epoch: 3,
  stratum: 'asserted',
  provenance: 'measured source',
  value,
  ...extra,
});

test('compatibility: comparison fences apply before invoking a consumer identity strategy', () => {
  const first = assertion(0), second = assertion(1);
  const calls = [];
  const inputs = [
    assertion(20, { stratum: 'quoted' }),
    assertion({ kind: 'unknown', reason: 'not measured' }),
    assertion({ kind: 'not-applicable', evidence: 'no such measure' }),
    assertion(undefined),
    assertion(9, { predicate: 'labels' }),
    first, second,
  ];
  const result = core.conflictsOf(inputs, new Set(['labels']), item => {
    calls.push(item);
    assert.ok(item === first || item === second, 'an incomparable assertion reached the identity strategy');
    return 'consumer-owned-key';
  });
  assert.deepEqual(calls, [first, second]);
  assert.equal(result.length, 1);
  assert.equal(result[0].key, 'consumer-owned-key');
});

test('compatibility: comparison preserves original witness identity and metadata without taking ownership', () => {
  const one = assertion({ nested: { z: 1, a: false } }, { runtimeStageId: 'run:1/stage:9', provenance: 'first source' });
  const two = assertion({ nested: { a: true, z: 1 } }, { runtimeStageId: 'run:1/stage:10', provenance: 'second source', synthetic: true });
  const input = [one, two];
  const before = structuredClone(input);
  const result = core.conflictsOf(input, undefined, () => 'legacy\u0000identity');
  assert.deepEqual(input, before);
  assert.notEqual(result[0].assertions, input);
  assert.equal(result[0].assertions[0], one);
  assert.equal(result[0].assertions[1], two);
  assert.equal(result[0].key, 'legacy\u0000identity');
  assert.equal(result[0].assertions[0].runtimeStageId, 'run:1/stage:9');
  assert.equal(result[0].assertions[1].synthetic, true);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(one), false);
});

test('compatibility: subject equality compares both exact fields without aliases or normalization', () => {
  const subject = { kind: 'entity', id: 'Node\u0000/11 ' };
  assert.equal(core.sameSubject(subject, { ...subject }), true);
  assert.equal(core.sameSubject(subject, { ...subject, kind: 'tool' }), false);
  assert.equal(core.sameSubject(subject, { ...subject, id: 'node\u0000/11 ' }), false);
  assert.equal(core.sameSubject(subject, { ...subject, id: 'Node\u0000/11' }), false);
});

test('compatibility: the extraction does not expose the abandoned reference-store or verdict APIs', () => {
  for (const name of ['createEvidenceContext', 'ContextEvidenceError', 'executeAnswerValidation']) {
    assert.equal(name in core, false, `${name} is outside this extraction`);
  }
});
