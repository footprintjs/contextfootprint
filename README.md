# ContextFootprint

Pure assertion identity and conflict comparison, extracted from AgentFootprint's existing context-integrity algebra. This is the first small extraction, with zero runtime dependencies and ESM, CommonJS and TypeScript entry points. Version 0.1.0 remains private to prevent accidental npm publication.

The host supplies assertions. ContextFootprint identifies groups of incompatible current readings. It does not collect facts, retrieve references, decide which source is true, validate an answer schema, repair an answer or enforce delivery.

```js
import { conflictsOf } from 'contextfootprint';

const current = {
  subject: { kind: 'node', id: 'cluster-a/node-11' },
  predicate: 'status',
  epoch: 3,
  stratum: 'asserted',
};
const conflicts = conflictsOf([
  { ...current, value: 'up', provenance: 'current inventory' },
  { ...current, value: 'down', provenance: 'current selected record' },
]);
// One conflict containing both original witnesses, in their input order.
```

## Public API

`SubjectRef` is `{ kind: string, id: string }`. The host stamps both fields; no aliases or inferred identity are introduced. `sameSubject(a, b)` compares both fields literally.

`Assertion` carries `subject`, `predicate`, `value`, `stratum: 'asserted' | 'quoted'`, and `provenance`. Optional fields are `epoch: number`, `runtimeStageId: string`, and `synthetic: true`. `AssertionStratum` exports the stratum union. An epoch is the host's version of that subject; it is not interpreted as a time interval.

`assertionKey(assertion)` returns a JSON tuple encoding subject kind, subject ID, predicate and epoch spelling. Missing epoch has its own empty spelling and does not match epoch zero. Tuple encoding separates identities containing embedded delimiters.

`participates(value)` excludes `undefined` and structurally tagged `{ kind: 'unknown' }` or `{ kind: 'not-applicable' }` values. Zero, false, empty string and null participate. `comparableValueOf(value)` unwraps `{ kind: 'known', value }` and otherwise returns the original value. These are the existing AgentFootprint Claim-face conventions; Claim constructors remain there. This package does not validate or authenticate a Claim-shaped object.

`conflictsOf(assertions, multiValued?, keyStrategy?)` returns `readonly Conflict[]`. A `Conflict` contains `key` and `assertions`, including every witness on the conflicting key in input order, even repeated equal readings. Groups follow first-key encounter order. Original witness object identities and metadata are retained. The function creates result containers but does not clone, freeze or mutate caller-owned assertions.

Only `asserted` values that participate are compared. `quoted` history is ignored. Different subjects, predicates or epochs do not conflict. Predicates in the optional `ReadonlySet<string>` of `multiValued` exemptions are ignored. With the default key strategy, each remaining key is single-valued; two distinct comparable values produce a conflict.

`AssertionKeyStrategy` is `(assertion: Assertion) => string`. The optional third argument is a narrow compatibility seam for an existing identity encoding. AgentFootprint can retain its recorded legacy keys without changing shared comparison behavior:

```js
const legacyKey = a =>
  `${a.subject.kind}\0${a.subject.id}\0${a.predicate}\0${a.epoch === undefined ? '' : String(a.epoch)}`;
const legacyConflicts = conflictsOf(assertions, new Set(), legacyKey);
```

A custom strategy must deterministically identify the intended comparison scope. It executes only after quotation, unknown and multi-valued exclusions. Errors propagate. A legacy delimiter strategy deliberately retains its legacy collision behavior; new consumers should use the safe default.

## Evidence and policy boundaries

An assertion states what a source or host claims. It is not authenticated knowledge. A conflict shows that two declared current readings cannot both satisfy the single-valued predicate; it does not prove which reading is correct or explain causation. An empty result means no conflict was found among comparable supplied assertions. It does not mean that evidence was retrieved, all required checks ran, or a response is verified.

The same algebra can be used before a model call to compare prepared context and after a model call to compare declared output claims with authoritative evidence. Host adapters own collection, identity stamping and translation into assertions at those boundaries. AgentFootprint still owns its context composition, tool/window lifecycle, diagnostic findings, check dispositions, repair loops and enforcing or observing answer-validation policy. This extraction does not turn its diagnostic `.claims()` mechanism into enforcement.

Viz and HCI adapters must define meaningful subjects, predicates, units, grain and versions before comparison. Domain-specific coverage requirements, dependency graphs, authentication, reference stores and schema validation are outside this package. The earlier reference-catalog prototype is archived separately; it is not part of this API.

## Inherited comparison limits

Value comparison retains AgentFootprint's sorted-object-key `JSON.stringify` behavior. Use finite JSON-compatible data and explicit Claim conventions. This is not an arbitrary JavaScript-value equality or validation engine: JSON can omit undefined properties, turn non-finite numbers into null, call `toJSON`, discard Map/Set contents and reject BigInt or cyclic objects. Such inherited behavior is unchanged for compatibility. Callers must validate their own input domain and size; there is no memory, CPU, I/O or callback sandbox.

## Development and provenance

Run `npm ci` and `npm run verify`. Verification covers type checking, comparison tests, the runnable example, and a packed consumer smoke in Node ESM, Node CommonJS, both TypeScript module modes and a browser-like VM without Node globals.

The original assertion and comparison code is from AgentFootprint 9.97.0, commit `daed2145d8329e6ae49daa91d07d855bb78fb2ac`. The semantic comparison loop and value rendering are retained; this extraction adds the safe default key and explicit legacy strategy. See `NOTICE` and `LICENSE` for MIT attribution.
