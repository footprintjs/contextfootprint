// Copyright (c) 2024-present Sanjay Krishna Anbalagan. MIT; extracted from AgentFootprint.
/**
 * Assertion — one typed claim about one subject, with the two rules that
 * give the algebra its teeth.
 *
 * Pattern: typed assertions + a keyed identity. Pure comparison; input
 * cloneability and JSON suitability remain the consumer's responsibility.
 * Role:    the Context Integrity substrate. Everything a seam adapter
 *          hands a check is first normalised into assertions keyed by
 *          `(subject, predicate, epoch)`, so every check compares one
 *          shape and subject identity is READ off stamps, never inferred.
 *
 * THE TWO RULES:
 *
 * **Serving is asserting; history is quotation.** A tool schema on the
 * wire asserts "available now"; a block labelled current-state asserts its
 * contents as current. Transcript history is `quoted` — it legitimately
 * holds superseded values, and checks never fire across the quoted
 * stratum. This one distinction eliminates the false-positive class of
 * stale-but-honest history with no judgment call.
 *
 * **Single-valued by default.** Two `asserted` assertions on one key with
 * different values contradict; multi-valued predicates are the declared
 * exception. Exemptions are declared, rules are never authored.
 *
 * Honest absence: a value that IS an unknown (a `Claim` whose kind is not
 * `'known'`) never participates in a comparison — an unknown can neither
 * corroborate nor contradict here. Consumers own how absence propagates
 * through their derived values.
 */

// Structural compatibility only; Claim constructors remain in AgentFootprint.
interface ClaimFace { readonly kind?: unknown; readonly value?: unknown }

/**
 * A stamped identity edge — WHO a fact is about, written at the one moment
 * the code demonstrably knows both ends (registration, mount, mint). The
 * checker only ever reads these; it never infers identity. Facts without a
 * shared stamped subject are incomparable and yield no conflict here.
 * Consumers own any unreachable/check-disposition accounting.
 */
export interface SubjectRef {
  /** What kind of thing — 'map' | 'skill' | 'tool' | 'action' | app kinds. Open by design. */
  readonly kind: string;
  readonly id: string;
}

/** The strata rule, as a type: only `asserted` facts can contradict. */
export type AssertionStratum = 'asserted' | 'quoted';

/** One typed claim about one subject. */
export interface Assertion {
  readonly subject: SubjectRef;
  /** The relation this asserts — 'status', 'offered', 'position', … */
  readonly predicate: string;
  /**
   * The claimed value. May be a plain value or a `Claim<T>`; a non-`known`
   * Claim never participates in any comparison (honest absence).
   */
  readonly value: unknown;
  /**
   * The epoch this was asserted UNDER — a monotonic version from the
   * subject's own counter (a session version, a cursor version). Two
   * assertions at DIFFERENT epochs are history, not contradiction; absent
   * means "the current, unversioned world", and only matches absent.
   */
  readonly epoch?: number;
  readonly stratum: AssertionStratum;
  /** Where this came from — one plain sentence or a source ref. */
  readonly provenance: string;
  /** The universal join key into commit logs and recordings, when known. */
  readonly runtimeStageId?: string;
  /** Consumer canary marker. Quarantine and counting are not performed here. */
  readonly synthetic?: true;
}

/** Narrow compatibility seam for consumers preserving existing recorded identity strings. */
export type AssertionKeyStrategy = (assertion: Assertion) => string;

/** Tuple identity avoids collisions when a subject or predicate contains a delimiter. */
export function assertionKey(a: Assertion): string {
  const epoch = a.epoch === undefined ? '' : String(a.epoch);
  return JSON.stringify([a.subject.kind, a.subject.id, a.predicate, epoch]);
}

/** Same stamped subject — the only identity the algebra ever claims. */
export function sameSubject(a: SubjectRef, b: SubjectRef): boolean {
  return a.kind === b.kind && a.id === b.id;
}

/** Does this value participate in comparisons? Unknowns never do. */
export function participates(value: unknown): boolean {
  const claim = value as ClaimFace | null;
  if (claim !== null && typeof claim === 'object' && typeof claim.kind === 'string') {
    if (claim.kind === 'unknown' || claim.kind === 'not-applicable') return false;
  }
  return value !== undefined;
}

/** The comparable face of a value: a known Claim compares by its value. */
export function comparableValueOf(value: unknown): unknown {
  const claim = value as ClaimFace | null;
  if (
    claim !== null &&
    typeof claim === 'object' &&
    claim.kind === 'known' &&
    'value' in (claim as object)
  ) {
    return (claim as { value: unknown }).value;
  }
  return value;
}
