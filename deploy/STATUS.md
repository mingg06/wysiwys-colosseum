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
