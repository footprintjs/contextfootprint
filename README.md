# ContextFootprint

Pure assertion identity and conflict comparison, extracted from [AgentFootprint](https://github.com/footprintjs/agentfootprint)'s existing context-integrity algebra. A small, synchronous library with zero runtime dependencies and ESM, CommonJS and TypeScript entry points. The 0.x API is intentionally narrow.

[Install and example](#try-it) · [Public API](#public-api) · [Evidence and policy boundaries](#evidence-and-policy-boundaries)

The host supplies assertions. ContextFootprint identifies groups of incompatible current readings. It does not collect facts, retrieve references, decide which source is true, validate an answer schema, repair an answer or enforce delivery.

## Try it

Install the published package:

```bash
npm install contextfootprint
```

For a source checkout, run `npm ci` and `npm run verify`. This runs both examples and checks the packed package.
To test a reviewed source archive locally, run `npm pack` here, then install the resulting archive in the consuming
project with `npm install /path/to/contextfootprint-0.1.1.tgz`.

ESM and TypeScript use the import below. CommonJS uses `const { conflictsOf } = require('contextfootprint')`. Browser bundlers use the ESM entry; the runtime requires neither Node nor DOM globals.

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

Those tags are reserved at the top level. If business data itself has that shape, explicitly wrap it as `{ kind: 'known', value: businessData }` to compare the payload as data.

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

| Layer | Responsibility |
| --- | --- |
| Host adapter | Read authorized evidence, validate its schema, stamp subjects/versions and normalize units. |
| ContextFootprint | Compare supplied assertions and return original conflicting witnesses. |
| Consumer library | Select checks, account for missing evidence, decide repair/refusal/delivery, and record results. |
| Application | Connect domain data and present the outcome. |

An assertion states what a source or host claims. It is not authenticated knowledge. A conflict shows that two declared current readings cannot both satisfy the single-valued predicate; it does not prove which reading is correct or explain causation. An empty result means no conflict was found among comparable supplied assertions. It does not mean that evidence was retrieved, all required checks ran, or a response is verified.

The same algebra can be used before a model call to compare prepared context and after a model call to compare declared output claims with authoritative evidence. Host adapters own collection, identity stamping and translation into assertions at those boundaries. AgentFootprint still owns its context composition, tool/window lifecycle, diagnostic findings, check dispositions, repair loops and enforcing or observing answer-validation policy. This extraction does not turn its diagnostic `.claims()` mechanism into enforcement.

Run `node examples/context-boundaries.mjs` after building for a small pre-call/post-call example. It separates conflicting claims from evidence that was not checked, rejects a wrong subject/version, and renders a checked value from its source. The example's delivery rules belong to the host; they are not new core APIs. Free-form prose is not automatically fact-checked.

Viz and HCI adapters must define meaningful subjects, predicates, units, grain and versions before comparison. Domain-specific coverage requirements, dependency graphs, authentication, reference stores and schema validation are outside this package. The earlier reference-catalog prototype is archived separately; it is not part of this API.

## Inherited comparison limits

Value comparison retains AgentFootprint's sorted-object-key `JSON.stringify` behavior, with a correction in 0.1.1 that preserves own JSON properties named `__proto__`. Use finite JSON-compatible data and explicit Claim conventions. This is not an arbitrary JavaScript-value equality or validation engine: JSON can omit undefined properties, turn non-finite numbers into null, call `toJSON`, discard Map/Set contents and reject BigInt or cyclic objects. Those inherited limits remain. Callers must validate their own input domain and size; there is no memory, CPU, I/O or callback sandbox.

## Development and provenance

Run `npm ci` and `npm run verify`. Verification covers type checking, comparison tests, the runnable example, and a packed consumer smoke in Node ESM, Node CommonJS, both TypeScript module modes and a browser-like VM without Node globals.

`npm pack` and `npm publish` run the same verification through `prepack`, so stale build output is rebuilt and checked before packaging. The internal packed smoke uses `--ignore-scripts` to avoid recursively invoking the gate. CI runs verification on Node 20 and 22. Runtime checks do not establish truth outside the supplied evidence or prove model reliability.

## Release

After reviewing and committing the version, changelog and source on `main`, run `npm run release`. Use `npm run release -- --dry-run` to exercise the same gate without publishing. The script checks the clean branch and calls npm publication through the verification gate. An authenticated npm publisher (and any required 2FA) is necessary; a source commit or a passing dry run does not mean npm publication succeeded. Check the registry version after publishing.

For later CI releases, `.github/workflows/publish.yml` verifies and packs the release-tagged source before publishing the exact archive with npm trusted publishing. Configure the npm package's trusted publisher for `footprintjs/contextfootprint`, workflow `publish.yml`; the workflow alone does not grant npm access. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

The original assertion and comparison code is from AgentFootprint 9.97.0, commit `daed2145d8329e6ae49daa91d07d855bb78fb2ac`. The semantic comparison loop and value rendering are retained; this extraction adds the safe default key and explicit legacy strategy. See `NOTICE` and `LICENSE` for MIT attribution.
