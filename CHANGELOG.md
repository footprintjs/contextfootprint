# Changelog

## 0.1.1 — release candidate

- Preserve own JSON properties named `__proto__`, including nested objects and known Claim payloads. Previously, distinct values could incorrectly compare equal. Public types, keys and witness ordering are unchanged.
- Prepare public npm metadata, include runnable examples and gate packing/publication on full verification.
- Add a pre-call/post-call host example that distinguishes missing evidence from a passed comparison and keeps enforcement out of the core.

## 0.1.0 — source-only preview

- Extract AgentFootprint's pure assertion vocabulary and conflict comparison.
- Keep quoted history, unknown values, multi-valued predicates, epochs and original witness ordering intact.
- Add safe tuple identity with an explicit legacy-key compatibility strategy.
- Provide dependency-free ESM/CommonJS runtime and declarations; package stays private.
