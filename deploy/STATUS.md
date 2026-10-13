# Deployment status

Updated 13 October 2026, Asia/Kuala_Lumpur. Continue with [the teammate runbook](TEAMMATE-HANDOFF.md).

The clean hosted devnet demo is verified at source commit `2d07a15c9f785b0549877bb22f649ac07233de01`. Start with [the demo guide](DEMO-READY.md). Railway is online in live DON mode, Vercel serves the fresh manifest, and proposal #3 has an automatic listener trigger and finalized executed payment. Full browser-origin signing, restart persistence, remaining live adversarial scenarios and a hosted settlement-order race remain separate checks.

## Verified fresh devnet Guard

- Program: `CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S`.
- ProgramData: `7mRmRBUFGPLxhMjR3ypVxW2yauP5dHE4VSAUYLkTMEH9`.
- Upgrade authority: `Cbfkee83NPThVWNZ488BkN9sEQWsC54jpDK2weVhjtN7`.
- Deployed in slot `510462395`, bytecode length `342240`.
- SHA-256 matches the user's local normal build. Evidence: `evidence/deploy/2026-10-13-guard-devnet.json`. This is not a reproducible-build audit.
- Source, Anchor localnet/devnet entries, shared IDL and review targets now name this verified address. The shared IDL schema is unchanged except for the address.
- The accidental local test-forwarder identity change is restored to its existing Anchor fixture address. No local test forwarder was deployed to devnet.

## Fresh treasury and live DON verified

`deployments/devnet.json`, `deployments/devnet.live.json` and `deployments/devnet.fresh-20261013.json` now name the verified fresh treasury and initialized GuardConfig. Executor/config PDAs derive under the new Guard. The simulator/live forwarder registry was verified against finalized devnet accounts before publication. The old manifest remains archived as `deployments/devnet.historical.json` for historical fixtures only.

Fresh test assets include multisig `CPKo7rv7raj27CU3wXjhKbpxxt3EQoebbQXy88uUGnbb`, a fresh mUSD mint and recipient accounts, three generated test voters and the new Guard's executor as the sole Execute member. Bootstrap verification is in `evidence/deploy/2026-10-13-fresh-treasury.json`. Finalized GuardConfig verification is in `evidence/deploy/2026-10-13-live-guard-config.json`. The treasury is unbound; settlement groups remain separate.

The live workflow targets the new Guard. Its HTTP trigger address names the dedicated devnet runner identity, `0xb1E3d6A0342bE079624CA5F278c29851c1570721`; its private key remains in gitignored `keys/cre-gateway.json`. Live config validation, all 83 review tests and the review TypeScript check pass. The native ordinary-DON dry run passed real three-provider reads, decoding, private policy and screening, with no report submitted (`evidence/cre/2026-10-13-review-don-local.log`). Its expired request was diagnostic only; a fresh transaction was used for the live test.

The user selected ordinary DON execution, the generated demo recipient, fresh mUSD mint, Scorechain screening and the recommended 1,000 mUSD per-payment cap. DON operators can see policy data at runtime; no live TEE confidentiality or attestation is claimed. The supplied Organization address matches the CLI-derived owner `0x0D06E59BB559Ac627dBa186E3D446865ceA4bb79` and immutable GuardConfig. Five required secrets were uploaded to that organization's Vault: the three RPC endpoints, `POLICY_DOCUMENT` and `SCORECHAIN_SANCTIONS_API_KEY`. The exact private document matches the treasury's commitment. At initial provisioning `POLICY_STORE_TOKEN` was not uploaded. Its current Vault configuration has not been rechecked; a matching Vault policy needs no fetch.

`wysiwys-review-live` is deployed and ACTIVE on the private registry, DON family `zone-a`, workflow ID `00e5b1f7c6880ef5c268817a96194b378226f602d824b8b7c144b90df5102b5c`. Public metadata: `evidence/cre/2026-10-13-live-workflow.json`. The live execution `618bfb9f-5d06-49cb-ae25-0d5dd85b087b` completed SUCCESS. Transaction index 2 received a finalized APPROVED review through the production forwarder's CPI into the new Guard; its transaction hash, policy hash and destination hash were verified. Report evidence: `evidence/cre/2026-10-13-live-review-decision.json`.

All three generated test voters approved, then guarded execution paid 250 mUSD. Finalized state shows Squads Executed, Review Executed, exactly 250,000,000 base units in the recipient account and the matching vault debit. Evidence: `evidence/cre/2026-10-13-live-payment.json` and `evidence/cre/2026-10-13-live-guarded-execution.log`. This proves the clean live review/payment path, not all adversarial scenarios or settlement binding. Continue hosting setup using `docs/plans/2026-10-13-cre-deployment.md` and the teammate runbook.

## Railway

- Project: `8feb4d17-a2fa-45c2-8753-517516756136`.
- Environment: `production` (`02bc742f-095d-4223-b8a2-e6d36b928588`).
- Service: `runner` (`1c572cbd-e708-4646-ba53-f72a9dce7e24`).
- URL: https://runner-production-1e71.up.railway.app
- Deployment `1b94deba-2cec-4c27-bafb-cdad2f00817c` is SUCCESS, source pinned to `2d07a15`, one running replica, no pending changes or reported failures. The 500 MB volume is mounted at `/data`.
- Public `/status` returns 200 with the verified Guard, live-only review mode, subscribed WebSocket and recent successful backfill. Sleeping must remain disabled.
- Runtime log at `2026-10-13T06:40:09.126370623Z` records the automatic trigger for proposal #3. History records one sent trigger, no trigger error and Executed. The finalized chain verification confirms three votes, matching transaction/policy hashes and the further 250 mUSD payout.
- Wallet-authenticated preparation through the deployed Vercel route succeeds both with the default policy and the explicitly selected current policy hash, demonstrating a registered current policy and a working frontend/runner token pairing. Anonymous preparation and CRE policy reads return 401. Private values were not inspected.
- The initial five CRE Vault secrets were uploaded during provisioning. The current Vault `POLICY_STORE_TOKEN` configuration was not rechecked; default-policy success does not establish policy fetch for custom/voted changes.
- The CLI could not complete the optional in-service connectivity check: local CLI authentication differs from the connected Railway account, no SSH key is available and its GraphQL call failed TLS. Public health, actual listener-triggered delivery and finalized chain state supply the demo verification. No runner restart was performed, so restart persistence is not claimed.
- Infrastructure specification: `.railway/railway.ts`. Do not set a deprecated `railway.json` configuration path.

## Vercel

- Project: `wysiwys-colosseum` (`prj_AW3G6XtSyEHJcuTBf2ozAajHQ7eC`).
- URL: https://wysiwys-colosseum.vercel.app/
- Production deployment `dpl_13GNWWfAzVehT6wxYVAEENtovGty` is READY at source commit `2d07a15`. It replaced the historical `5b3f426` deployment.
- `/api/squads/config` returns 200 and names the fresh Guard, treasury, executor and mint. `/api/runner/status` returns 200 with the live subscribed listener.
- Chrome checks loaded the demo treasury dashboard, transaction list, proposal #3 and service status without page errors or HTTP 5xx responses. The UI displays the completed Guard review, 3 of 3 votes, executed payment and devnet label. Preparation succeeded with a real signed ephemeral-wallet request; no transaction was submitted by that check.
- Public evidence: `evidence/deploy/2026-10-13-hosted-demo-check.json`, `2026-10-13-hosted-chain-check.json` and `2026-10-13-hosted-preparation-check.json`. The observed proposal was signed outside this verification session; its browser origin was not independently established.

## Network scope

Devnet only. QuickNode, Helius and Alchemy remain the three independent review sources; Helius WebSocket feeds the continuous Railway listener. Solami integration is deferred because the user's access is mainnet-only. EC2 is gone and is not a policy-store or key source.

## Handoff checks

All workspace tests (374), CRE review fixture tests (83), configuration checks (4), runner runtime/connectivity checks (4) and WSL deployment-helper tests (3) passed. Workspace and review-project TypeScript checks and the Next.js production build passed. The 374 workspace tests and four configuration checks passed again during hosting continuation. Hosted payment evidence is recorded separately above; none of these checks proves TEE execution. The local-validator Guard security suite was not rerun for this address-only synchronization.
