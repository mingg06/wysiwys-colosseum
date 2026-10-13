# Deployment status

Updated 13 October 2026, Asia/Kuala_Lumpur. Continue with [the teammate runbook](TEAMMATE-HANDOFF.md).

## Verified fresh devnet Guard

- Program: `CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S`.
- ProgramData: `7mRmRBUFGPLxhMjR3ypVxW2yauP5dHE4VSAUYLkTMEH9`.
- Upgrade authority: `Cbfkee83NPThVWNZ488BkN9sEQWsC54jpDK2weVhjtN7`.
- Deployed in slot `510462395`, bytecode length `342240`.
- SHA-256 matches the user's local normal build. Evidence: `evidence/deploy/2026-10-13-guard-devnet.json`. This is not a reproducible-build audit.
- Source, Anchor localnet/devnet entries, shared IDL and review targets now name this verified address. The shared IDL schema is unchanged except for the address.
- The accidental local test-forwarder identity change is restored to its existing Anchor fixture address. No local test forwarder was deployed to devnet.

## Treasury and CRE still pending

`deployments/devnet.json` is explicitly `PROGRAM_DEPLOYED_TREASURY_PENDING`: no treasury, executor/config PDA, mint or policy commitment is asserted. The frontend disables treasury actions until bootstrap publishes a real fresh manifest. The old manifest is archived as `deployments/devnet.historical.json` for historical fixtures only.

The teammate must bootstrap fresh test assets, supply the actual private policy and initialize the new treasury's immutable GuardConfig for the chosen simulator/live path. The policy and whitelist are not in this handoff. The test bootstrap treasury is unbound; create separate opt-in settlement groups before proposals for the settlement-order demo.

The live workflow now targets the new Guard and Railway policy-store URL. Its HTTP trigger address is the invalid `REPLACE_WITH_TEAMMATE_TRIGGER_ADDRESS` prerequisite, so schema validation blocks premature live deployment. The teammate must supply the actual caller address, workflow owner and secrets using their own CRE account. Historical workflows pinned to the old Guard cannot be reused unchanged. No new workflow deployment, report delivery, DON evidence or TEE attestation has been performed.

## Railway

- Project: `8feb4d17-a2fa-45c2-8753-517516756136`.
- Environment: `production` (`02bc742f-095d-4223-b8a2-e6d36b928588`).
- Service: `runner` (`1c572cbd-e708-4646-ba53-f72a9dce7e24`).
- Reserved URL: https://runner-production-1e71.up.railway.app
- Last inspected: 21 non-destructive staged changes, no runner deployment. One 500 MB `/data` volume, one replica, sleeping disabled; source pin still `5b3f426`.
- Only six variable names are staged: backfill interval, Helius RPC, Node environment, port, DB path and settlement token. CRE secrets are still required. Secret values were not read.
- Confirm Full Trial/outbound connectivity, supply path-specific secrets, update the source pin to a tested commit with a complete fresh treasury manifest and apply the reviewed patch. Keep sleeping disabled.
- Infrastructure specification: `.railway/railway.ts`. Do not set a deprecated `railway.json` configuration path.

## Vercel

- Project: `wysiwys-colosseum` (`prj_AW3G6XtSyEHJcuTBf2ozAajHQ7eC`).
- URL: https://wysiwys-colosseum.vercel.app
- Last verified READY deployment: `dpl_8BnyiFYgcHQM4Qz7hi7HyZVZGdfS`, commit `5b3f426`. Subsequent pushes may trigger frontend deployments; a READY frontend does not prove the backend works.
- Rebuild with the completed fresh treasury manifest and working Railway URL/token. Runtime payment readiness is pending the runner, CRE path and chain verification.

## Network scope

Devnet only. QuickNode, Helius and Alchemy remain the three independent review sources; Helius WebSocket feeds the continuous Railway listener. Solami integration is deferred because the user's access is mainnet-only. EC2 is gone and is not a policy-store or key source.

## Handoff checks

All workspace tests (374), CRE review fixture tests (83), configuration checks (4), runner runtime/connectivity checks (4) and WSL deployment-helper tests (3) passed. Workspace and review-project TypeScript checks and the Next.js production build passed. These are code checks, not a fresh treasury payment, live DON delivery or TEE proof. The local-validator Guard security suite was not rerun for this address-only synchronization.
