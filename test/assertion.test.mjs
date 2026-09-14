import test from 'node:test';
import assert from 'node:assert/strict';
import { assertionKey, comparableValueOf, conflictsOf, participates, sameSubject } from '../dist/esm/index.js';

const reading = (value, extra = {}) => ({ subject: { kind: 'node', id: '11' }, predicate: 'latency', value, epoch: 4, stratum: 'asserted', provenance: 'source:a', ...extra });
const legacyKey = a => `${a.subject.kind}\0${a.subject.id}\0${a.predicate}\0${a.epoch === undefined ? '' : String(a.epoch)}`;

test('different current readings conflict; structurally equal readings do not', () => {
  assert.equal(conflictsOf([reading(12), reading(18)]).length, 1);
  assert.deepEqual(conflictsOf([reading({ a: 1, b: [2, 3] }), reading({ b: [2, 3], a: 1 })]), []);
  assert.equal(conflictsOf([reading([1, 2]), reading([2, 1])]).length, 1);
});

test('quoted history, different epochs, identities and declared multiple values cannot contradict', () => {
  const cases = [
    [reading(1), reading(2, { stratum: 'quoted' })],
    [reading(1), reading(2, { epoch: 5 })],
    [reading(1, { epoch: undefined }), reading(2, { epoch: 0 })],
    [reading(1), reading(2, { subject: { kind: 'node', id: '12' } })],
    [reading(1), reading(2, { predicate: 'capacity' })],
  ];
  for (const pair of cases) assert.deepEqual(conflictsOf(pair), []);
  assert.deepEqual(conflictsOf([reading(1), reading(2)], new Set(['latency'])), []);
});

test('known claims compare by value; explicit absence never becomes zero or null', () => {
  const absent = [undefined, { kind: 'unknown', reason: 'not measured' }, { kind: 'not-applicable', evidence: 'other entity' }];
  for (const value of absent) {
    assert.equal(participates(value), false);
    assert.deepEqual(conflictsOf([reading(value), reading(0)]), []);
  }
  for (const value of [0, false, '', null]) assert.equal(participates(value), true);
  assert.deepEqual(conflictsOf([reading({ kind: 'known', value: 0, evidence: 'measured' }), reading(0)]), []);
  assert.equal(comparableValueOf({ kind: 'known', value: null }), null);
  assert.equal(conflictsOf([reading(0), reading(null)]).length, 1);
});

test('conflicts retain all witnesses in source order and preserve their exact object identities', () => {
  const first = reading(1), repeated = reading(1), second = reading(2), later = reading(3);
  const other = reading('up', { predicate: 'status' });
  const otherBad = reading('down', { predicate: 'status' });
  const input = Object.freeze([first, other, repeated, second, later, otherBad]);
  const output = conflictsOf(input);
  assert.equal(output.length, 2);
  assert.deepEqual(output[0].assertions, [first, repeated, second, later]);
  assert.equal(output[0].assertions[0], first);
  assert.equal(output[1].assertions[1], otherBad);
  assert.equal(output[0].key, assertionKey(first));
});

test('safe tuple identity separates embedded NUL delimiters; explicit legacy strategy preserves old grouping and keys', () => {
  const left = reading(1, { subject: { kind: 'a\0b', id: 'c' } });
  const right = reading(2, { subject: { kind: 'a', id: 'b\0c' } });
  assert.equal(legacyKey(left), legacyKey(right));
  assert.notEqual(assertionKey(left), assertionKey(right));
  assert.deepEqual(conflictsOf([left, right]), []);
  const legacy = conflictsOf([left, right], new Set(), legacyKey);
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].key, legacyKey(left));
  assert.equal(legacy[0].assertions[1], right);
});

test('legacy key adapter preserves expected original groups, witness order and numeric epoch spellings', () => {
  const first = reading({ total: 4 }), second = reading({ total: 9 });
  const quoted = reading({ total: 8 }, { stratum: 'quoted' });
  const history = reading({ total: 10 }, { epoch: 3 });
  const input = [first, quoted, history, second];
  assert.deepEqual(conflictsOf(input, new Set(), legacyKey), [{ key: 'node\x0011\x00latency\x004', assertions: [first, second] }]);
  assert.notEqual(assertionKey(reading(0, { epoch: undefined })), assertionKey(reading(0, { epoch: 0 })));
  assert.equal(sameSubject({ kind: 'x', id: '1' }, { kind: 'x', id: '1' }), true);
});

test('JSON comparison behavior is inherited, not generalized into a non-JSON value validator', () => {
  assert.deepEqual(conflictsOf([reading({ absent: undefined }), reading({})]), []);
  assert.deepEqual(conflictsOf([reading(NaN), reading(null)]), []);
  assert.throws(() => conflictsOf([reading(1n), reading(2n)]), TypeError);
});
