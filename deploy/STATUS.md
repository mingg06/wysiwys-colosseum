# Deployment status

Updated 13 October 2026, Asia/Kuala_Lumpur.

## Vercel

- Connected account: `mingg06's projects`.
- Project: `wysiwys-colosseum` (`prj_AW3G6XtSyEHJcuTBf2ozAajHQ7eC`).
- URL: https://wysiwys-colosseum.vercel.app
- Deployment: `dpl_8BnyiFYgcHQM4Qz7hi7HyZVZGdfS`, production, READY, commit `5b3f426`.
- Node 22, root `app`, outside-root source files enabled.
- Server-only RPC, Railway URL and matching settlement token configured. Values are never recorded here.
- Public homepage: HTTP 200, required devnet label present.
- Deployed `/api/squads/config`: HTTP 200, public manifest accessible.
- `/api/runner/status`: HTTP 503 with no active listener. The backend is staged, so the full payment demo is not ready.

## Railway

- Connected workspace: `Jian Ming's Projects`.
- Project: `8feb4d17-a2fa-45c2-8753-517516756136`.
- Environment: `production` (`02bc742f-095d-4223-b8a2-e6d36b928588`).
- Service: `runner` (`1c572cbd-e708-4646-ba53-f72a9dce7e24`).
- Reserved URL: https://runner-production-1e71.up.railway.app
- Pending: pinned GitHub source at `5b3f426`, Dockerfile, continuous listener settings, server variables and 500 MB volume mounted at `/data`.
- No runner deployment has been committed. Trial status is Limited Trial or unconfirmed; do not rely on outbound RPC/CRE access yet.
- New services reject legacy `railway.json` settings. The current `.railway/railway.ts` specification preserves credentials and has been checked against official SDK 3.15.0. MCP settings can be applied independently of the CLI specification.

## Fresh devnet Guard

The existing Guard's upgrade key is unavailable. The user authorized a fresh deployment and new demo treasuries instead.

- New deployer: `Cbfkee83NPThVWNZ488BkN9sEQWsC54jpDK2weVhjtN7`.
- Planned program: `CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S`.
- New back-office authority: `Ami13zt2j38hG5UeAsik3PDdHxqeVaJrL79MTxhrYtsq`.
- Keypairs are gitignored in `keys/devnet-deployer.json`, `keys/guard-program.json`, and `keys/settlement-authority.json`. Back them up securely; they are devnet test keys.
- Deployer balance is zero. The public faucet rejected the automatic request; fund with devnet SOL before deployment.
- The source, IDL and public manifest still name the existing Guard. Change them together with the fresh bootstrap and verification, then rebuild and redeploy the frontend and backend. The planned program above has not been deployed.

Still needed: confirmed Railway outbound connectivity, CRE simulation API access (or a usable deployed live workflow), three independent devnet RPC providers, a private policy and funded devnet transmitter. The new private policy must be generated for the new recipients and mint and committed by hash; the historical policy hash cannot substitute for a missing document. Full mismatch/race demo and video recording remain pending.

The user has no Chainlink account access. The attempted CLI browser login was cancelled. Historical live workflows are pinned to the old Guard and EC2 policy-store URL and cannot be reused unchanged for the fresh setup. The user requested [mock demo guidelines](../docs/colosseum/MOCK-DEMO.md) instead; no new reviewer adapter or removal of the CRE security boundary is authorized or implemented.

## Handoff for teammate with CRE access

Rechecked on 13 October 2026. The user asked to push the work so their teammate with CRE access can continue. Devnet only; mainnet is outside this handoff. Solami integration is deferred because the available endpoints are mainnet-only. Keep QuickNode, Helius and Alchemy for the CRE source quorum and Helius for the Railway listener.

Verified current prerequisites:

- Railway still has 21 staged changes and no deployed runner. The patch is non-destructive, includes the repository source pinned to `5b3f426`, one 500 MB `/data` volume, one replica and sleeping disabled. Only six variable names are configured; CRE secrets are not configured. Values were not read.
- Public devnet RPC reports the fresh deployer balance as zero and the planned Guard program account as absent. Another 2 SOL faucet request was rejected, so manual devnet funding is still needed. No Guard deployment was attempted.
- WSL has Solana and Anchor available. The existing local Guard binary is a local-test artifact; rebuild without `short-policy-delay` before devnet deployment. Docker Desktop's engine is unavailable on this machine.
- 159 relevant tests passed: CRE review 83, RPC diagnostic/quorum 32, runner API/listener 40 and deployment runtime/connectivity 4. Runner and both CRE projects passed TypeScript checks. These tests are not hosted devnet or live DON evidence.

Continue in this order:

1. Obtain the gitignored fresh devnet keypairs from the owner through a secure channel; never push them. Fund the public deployer address above with devnet SOL. Recover/provide the intended private policy document and screening inputs securely.
2. Choose a usable CRE path and configure the new Guard and workflow consistently. Simulation requires the mock forwarder and simulator workflow owner; live DON requires verified live forwarder/provenance and the matching workflow owner. Do not reuse the old live workflow's Guard or EC2 policy-store configuration. Do not remove the CRE gate to make a demo work.
3. Build and deploy the fresh Guard on devnet without local-test features. The historical `scripts/deploy-guard-devnet.sh` currently points to `keys/wysiwys_guard-program-keypair.json`, not the newly authorized keypair. Adapt and verify the deployment procedure first; do not invoke that script unchanged for the fresh deployment. Keep source, IDL, workflow configuration and manifest consistent with the verified deployed address, then bootstrap new demo treasuries.
4. Add the required credentials directly to Railway and CRE, using the templates in `deploy/README.md`. Confirm Railway Full Trial/outbound access. Update the staged source pin to the reviewed handoff/deployment commit when it is ready; the current patch still targets `5b3f426`.
5. Run the configured CRE review in non-broadcast local simulation first, save sanitized evidence, then verify the selected devnet delivery path. Test both approval arrival orders, exactly-once execution, the rejection scenarios, ownership drift and rollback. Simulation/mock and live DON/TEE evidence must be labelled separately.
6. Apply the reviewed Railway patch only after prerequisites are complete. Verify `/status`, finalized WebSocket subscription, backfill and SQLite persistence, then redeploy the Vercel frontend with the same verified deployment manifest and record the end-to-end demo.

No secrets, wallet files or private policy documents are included in the repository handoff. See `docs/plans/2026-10-13-solami-rpc.md` for the provider decision.
