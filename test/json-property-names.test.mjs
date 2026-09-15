import test from 'node:test';
import assert from 'node:assert/strict';
import { conflictsOf } from '../dist/esm/index.js';

const reading = value => Object.freeze({ subject: Object.freeze({ kind: 'record', id: 'snapshot/one' }),
  predicate: 'configuration', stratum: 'asserted', provenance: 'declared JSON', value });

test('own __proto__ data participates in comparison rather than disappearing into an object prototype', () => {
  const first = reading(JSON.parse('{"__proto__":{"threshold":1}}'));
  const second = reading(JSON.parse('{"__proto__":{"threshold":2}}'));
  const before = [JSON.stringify(first.value), JSON.stringify(second.value)];
  const result = conflictsOf(Object.freeze([first, second]));
  assert.equal(result.length, 1);
  assert.equal(result[0].assertions[0], first);
  assert.equal(result[0].assertions[1], second);
  assert.deepEqual([JSON.stringify(first.value), JSON.stringify(second.value)], before);
  assert.equal(Object.getPrototypeOf(first.value), Object.prototype);
  assert.equal(Object.prototype.threshold, undefined);
});

test('an own null-valued prototype name differs from an absent property', () => {
  assert.equal(conflictsOf([reading(JSON.parse('{"__proto__":null}')), reading({})]).length, 1);
});

test('reserved property names compare structurally at every nested JSON depth and through a known claim', () => {
  const left = JSON.parse('{"records":[{"__proto__":{"a":1,"b":false},"constructor":0,"prototype":null,"toString":"text","hasOwnProperty":true}]}');
  const reordered = JSON.parse('{"records":[{"hasOwnProperty":true,"toString":"text","prototype":null,"constructor":0,"__proto__":{"b":false,"a":1}}]}');
  const changed = JSON.parse('{"records":[{"hasOwnProperty":true,"toString":"text","prototype":null,"constructor":0,"__proto__":{"b":true,"a":1}}]}');
  assert.deepEqual(conflictsOf([reading(left), reading(reordered)]), []);
  assert.equal(conflictsOf([reading(left), reading({ kind: 'known', value: changed })]).length, 1);
});
