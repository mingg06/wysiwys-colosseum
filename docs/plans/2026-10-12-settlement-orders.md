# Settlement orders

Status: implementation in progress. Authorized by the user on 12 October 2026, including an explicit set of eligible source vaults and commits after passing checks.

## Contract

A new treasury may opt into order enforcement before its first Squads proposal. Its creator signs an immutable `SettlementBinding` PDA (`settlement_binding`, multisig) naming a separate back-office authority. That authority cannot be a Squads member or the executor. Existing GuardConfig, Review, policy layers, tx hash and report v2 layouts remain unchanged.

The back-office authority signs `authorize_settlement_order`. An immutable `SettlementOrder` PDA (`settlement_order`, authority, 32-byte order ID) records up to eight distinct eligible vault addresses, SOL or legacy SPL token kind, exact destination account, recipient wallet, mint, integer amount, decimals and Unix deadline. The application hashes nonempty external IDs with SHA-256 over `wysiwys:order:v1` followed by UTF-8 ID bytes. The authority's ID namespace spans treasuries. IDs must identify business obligations consistently; differently named duplicate obligations cannot be detected.

`guarded_execute` gains a deterministic binding account and an optional writable order account. An absent binding permits the existing legacy flow. A present binding requires the correct authority's order; omitting the order fails. The Guard independently decodes the actual stored Squads message, permits exactly one supported payment, derives its source vault, and checks every order field against the payment and live token accounts. Browser metadata and policy reports cannot substitute for these checks.

The Guard writes both Review Executed and order consumed before its existing Squads CPI. A failed transfer, insufficient vote or timelock rolls back both. Every eligible vault must lock the same writable order PDA. Records are never closed, reset or reauthorized. No new executor signing entry point is introduced.

The new instruction/account contracts are an explicitly authorized extension to the frozen API. Clients and the published IDL must update together; old execution builders fail closed. The authority is a separate key; organizational independence and secure key custody remain operational responsibilities.

## Phases and checks

1. Shared terms, identifiers, PDA helpers and documentation. Run shared tests and typecheck, then commit.
2. Guard binding, authorization and atomic execution gate. Start with failing parser/security tests. Build the program and IDL; run Rust and local-validator integration checks for mismatches, bypasses, replay, wrong authority, deadlines, multi-vault races and rollback, then commit.
3. Runner builders, app integration and a repeatable demo. Run workspace tests/typechecks and app checks, then commit. Document exact demo and deployment commands.

Phase 1 is committed as `f714b64`. Phase 2 passed 70 Rust unit tests, an Anchor SBF build and all 131 local-validator integration tests, including the shared-order race and atomic rollback. The compatible local validator is Agave 4.3; Agave 3.1 cannot execute this Anchor toolchain's SBPF output. These checks do not constitute a devnet deployment.

Phase 3 includes Vercel for the frontend and existing Next.js API routes, plus one continuously running Railway runner/listener/CRE service with persistent SQLite. The existing browser-to-Next-to-runner flow remains intact. See `deploy/README.md` for the deployment configuration and account prerequisites.

The runner/app order integration is implemented. Checks passed: 41 shared tests, 108 runner tests, 154 app unit tests, 20 browser tests, workspace typechecks, production Next.js build and manifest smoke test, and 16 targeted local-validator builder checks. The creation-size check bounds order-enabled treasuries to eight invited members; legacy creation retains its existing bound. Railway container/runtime verification is tracked with the hosting phase.

No successful devnet deployment, live DON consensus, confidential attestation or institutional adoption is claimed by this implementation.
