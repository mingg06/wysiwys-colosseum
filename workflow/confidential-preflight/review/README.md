# Wysiwys review workflow (CRE)

Fresh Guard setup: follow `deploy/TEAMMATE-HANDOFF.md` and `deploy/STATUS.md`. All review targets name the verified new Guard. The live trigger address names the dedicated devnet runner identity generated during the 13 October setup; verify that the deployed runner controls that key, or replace the public address with its actual caller identity before deployment. The old EC2 policy-store endpoint is removed. Historical fixture accounts retain their original Guard identity.

HTTP trigger `{ multisig, txIndex }` -> 2-of-3 reads (QuickNode, Helius, Alchemy, finalized) of the Review, the stored Squads transaction, the GuardConfig and the destination -> `tx_hash` check -> decode -> private policy (`POLICY_DOCUMENT`, hash must equal the guard's `policy_hash`) and Scorechain screening inside the TEE -> 117-byte report v2 through the forwarder to the guard's `on_report`. Contract: `docs/specs/guard-cre-interface.md`.

The `live-devnet` target uses ordinary DON execution. Policy evaluation and screening run on DON nodes, whose operators can see policy data at runtime. It provides no TEE confidentiality. The confidential handler remains available separately and requires verified enrollment for live use.

The broadcast simulation target uses the CRE simulator's mock forwarder, which does not verify DON signatures. The TEE is simulated locally when the confidential handler is selected.

## Run

From `workflow/confidential-preflight` (the project root):

```bash
# a Pending review to process (test treasury)
npx tsx ../../scripts/propose-devnet.ts clean         # prints txIndex; wait ~20 s for finality

# dry run: real reads and policy evaluation, no report generation or submission
cre workflow simulate review --target local-simulation --non-interactive --trigger-index 0 \
  --http-payload '{"multisig":"<multisig>","txIndex":"<n>"}'

# write the report to the guard on devnet
cre workflow simulate review --target staging-settings --non-interactive --trigger-index 0 --broadcast \
  --http-payload '{"multisig":"<multisig>","txIndex":"<n>"}'

# then vote 3 of 3 and execute (test signers)
npx tsx ../../scripts/finish-devnet.ts <n>
```

Or let the runner do it for every new review: root `.env` `CRE_PROJECT_DIR=<abs path to workflow/confidential-preflight>`, `CRE_WORKFLOW=review`.

From the repo root, `npx tsx scripts/simulate-review-local.ts <public-identifiers.json>` runs only the `local-simulation` command above. It consumes the local environments and, if `CRE_POLICY_DOCUMENT` is absent, the gitignored `workflow/policy.json` opaquely. It never prints policy/API values, puts them in arguments or writes them to evidence. The default input replays the existing public test-treasury transaction 1. This helper cannot broadcast.

## Project `.env` (gitignored)

`CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL`, `CRE_HELIUS_SOLANA_DEVNET_RPC_URL`, `CRE_ALCHEMY_SOLANA_DEVNET_RPC_URL`, `CRE_SCORECHAIN_SANCTIONS_API_KEY`, `CRE_POLICY_DOCUMENT` (one document or a registry array on one line). `CRE_POLICY_STORE_TOKEN` is required only for the authenticated policy-store fallback. Mock broadcast simulation needs `CRE_SOLANA_PRIVATE_KEY` (funded devnet transmitter). CRE CLI v1.37 uses a default signing key for non-broadcast simulation; private-registry deployment uses account authentication and does not require `CRE_ETH_PRIVATE_KEY`. Live DON report transmission uses the DON's transmitter.

The 13 October ordinary-DON deployment and finalized clean payment are recorded in `deploy/STATUS.md` and `evidence/cre/2026-10-13-live-payment.json`. Hosted runner activation remains pending.

## Notes

- At most 13 HTTP calls: 6 genesis/slot checks, 3 initial account reads, 3 destination reads and 1 Scorechain call. Both reads reuse a DON-agreed median slot floor and identical eligible-source set. Wrong-chain/failed providers never re-enter the destination read.
- RPC secret references must resolve to HTTPS endpoints for QuickNode (`*.quiknode.pro`), Helius (`devnet.helius-rpc.com`) and Alchemy (`solana-devnet.g.alchemy.com`), in that order. A provider URL cannot count twice. These domain checks prevent configuration mistakes; they do not prove API truth or upstream independence.
- Reads are at `finalized`: a review requested seconds ago can make providers disagree (`RPC_NO_QUORUM`); retry after ~20 s.
- Report mode fails closed on no quorum, stale destination, policy mismatch, deadline passed or screening errors. It requires successful transaction and receiver statuses, no returned error and a nonzero 64-byte signature. Decided reviews are skipped.
- `local-simulation` can replay decided or expired reviews and labels `reviewStatus`, `withinDeadline` and `reportSubmitted: false`. It runs the same reads, hash check, decoder and policy path but exits before `report`/`writeReport`, even if someone accidentally supplies `--broadcast`. Its outcome is a diagnostic, not a new on-chain approval.
- The runner acknowledges broadcast delivery only after a finalized, guard-owned, correctly bound decided Review is read from chain. Dry runs cannot acknowledge listener triggers. Finality lag or RPC failure remains retryable.
- `bun test` runs decoder/decision/quorum fixtures and complete-handler tests with mocked capability I/O, including delivery failures. `bun run typecheck` checks the workflow. Native simulation separately checks real capabilities.
- The decoder and Scorechain request are inside `handlerInTee`; public reads and derived report submission use `usingTheDons`. Local confidential simulation does not require enrollment; live confidential deployment requires separate private-beta enrollment and actual attestation.
