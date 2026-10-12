# Vercel frontend and Railway runner

The browser calls the existing Next.js API routes on Vercel. Those server routes call the Railway runner with a bearer token. One continuous Railway process contains the finalized Solana listener, SQLite history and CRE triggering. All payments target Solana devnet. The site displays **Devnet, test keys only**.

## Before deployment

1. Have access to the repository, a Vercel project and a Railway project. No repository push or account deployment is performed by these configuration files.
2. In Railway, verify that the account has **Full Trial**, rather than Limited Trial. Limited Trial restricts outbound networking. Open [Railway verification](https://railway.com/verify) and check the account's trial status. See [trial documentation](https://docs.railway.com/pricing/free-trial).
3. Provide real devnet HTTPS and WSS RPC endpoints and credentials for the selected CRE path. Three independent RPC endpoints are needed by the review workflow. Do not reuse a single provider three times.
4. Upgrade the Guard on devnet using the normal deployment key, without `short-policy-delay`, and publish the generated IDL with the code. Settlement-enabled treasuries must be newly created with their binding before any proposals. Local test binaries and the test forwarder are never devnet deployments.
5. Confirm `deployments/devnet.json` describes the intended devnet Guard, forwarders and default policy commitment. The app bundles this public manifest into Vercel server routes. Custom private policy documents stay in Railway secrets and SQLite, never in this manifest.

## Railway setup

1. Create **one service** from this repository. Keep its root directory at the repository root. Set its configuration-file path to `deploy/railway/railway.json`. The manifest selects `deploy/railway/Dockerfile`.
2. Attach one persistent volume at **`/data`**. Set `RUNNER_DB_PATH=/data/runner.db`. The manifest requires this mount; it does not create the volume for you. SQLite also stores policy documents and the listener cursor. Preserve and back up the volume across redeploys.
3. Keep one replica. Ensure **Serverless / sleeping is disabled** in service settings. The manifest sets `sleepApplication=false`. The listener needs continuous outbound subscriptions and minute-by-minute backfill; an HTTP request cannot replace it. [Serverless behavior](https://docs.railway.com/deployments/serverless).
4. Set the variables from [Railway template](railway/.env.example) in Railway's Variables panel. Set `PORT=8787` for the packaged simulator's local policy-store URL and make the domain target that port. Generate independent random tokens, for example `openssl rand -hex 32`. Do not copy example placeholders into a live service.
5. Generate a Railway HTTPS domain and note its URL. Use it on Vercel as described below. Keep the backend endpoints bearer-protected; no browser RPC or CRE credentials are needed.
6. Deploy and open `https://YOUR_RUNNER_DOMAIN/status`. A healthy listener returns HTTP 200; unsubscribed or stale backfill returns 503. Check both HTTPS RPC and WSS subscription connectivity from the deployed service. A container build succeeding does not establish Full Trial network access.
7. In a Railway service shell, run `node deploy/railway/check-connectivity.mjs` (or `railway ssh -- node deploy/railway/check-connectivity.mjs` from a linked local project). This checks each configured RPC's devnet genesis hash and an acknowledged finalized `logsSubscribe`, without printing credential-bearing URLs. Live mode also checks gateway HTTP reachability. Then propose one test payment and confirm that CRE actually writes its review on chain. Gateway HTTP reachability alone does not prove authorization, DON execution or simulation API access.

The default image includes pinned CRE CLI 1.35.0 with its SHA-256 check, Bun 1.3.5, workflow files and installed SDK dependencies. The entrypoint writes a gitignored, mode-600 CRE `.env` at runtime from Railway variables. Secrets are excluded from Docker build context. It normalizes the policy document to one-line JSON and rejects ambiguous newline or quote encodings without logging secret values.

For simulation, set `CRE_PROJECT_DIR=/opt/wysiwys/workflow/confidential-preflight`, `CRE_TARGET=staging-settings` and `CRE_BROADCAST=true`, and supply `CRE_API_KEY`, all three `CRE_*_SOLANA_DEVNET_RPC_URL` variables, a funded devnet `CRE_SOLANA_PRIVATE_KEY`, a throwaway `CRE_ETH_PRIVATE_KEY` and the matching `CRE_POLICY_DOCUMENT`. Screening additionally needs its provider key when enabled. `POLICY_FETCH_TOKEN` and `CRE_POLICY_STORE_TOKEN` must match if using the policy store. The runner seeds the initial policy into SQLite; member-proposed policies are stored there too. The workflow's `config.staging.json` policy-store URL is `http://127.0.0.1:8787`; set `PORT=8787` on this one-service simulation setup so dynamic policy lookup reaches the local runner. Map the Railway public domain's target port to 8787. Alternatively update that workflow configuration to match a different chosen port.

For an already deployed live DON workflow, set `CRE_PROJECT_DIR` to an empty value and supply `CRE_WORKFLOW_ID` and `CRE_GATEWAY_PRIVATE_KEY`. Use a treasury whose immutable GuardConfig names the live forwarder. Configure CRE secrets in the Chainlink account separately. Live gateway triggering needs deployment access; a simulation API key alone does not grant it. Simulation is not live DON or TEE evidence.

Optional `REVIEW_TOKEN` protects manual `POST /review` retries. Optional `ADMIN_TOKEN` protects mode switching when both paths are configured. `CRE_TRIGGER_URL` and `CRE_TRIGGER_TOKEN` remain unset for the normal in-process paths. `BACKFILL_INTERVAL_MS=60000` preserves the current listener health contract.

## Vercel setup

1. Import the repository as a Next.js project with **Root Directory `app`**. Enable **Include source files outside of the Root Directory in the Build Step** because shared packages and the manifest live outside `app`. [Vercel monorepo instructions](https://vercel.com/docs/monorepos/monorepo-faq).
2. Use `app/vercel.json`: install command `cd .. && npm ci --ignore-scripts`, build command `npm run build`, output `.next`. Build the root npm workspace, not the historical standalone app lockfile. Use Node.js 22.x in project settings.
3. Set server-only variables in the intended Vercel environment:

| Variable | Value |
| --- | --- |
| `WYSIWYS_SETTLEMENT_URL` | Railway's HTTPS URL, for example `https://YOUR_RUNNER_DOMAIN` |
| `WYSIWYS_SETTLEMENT_TOKEN` | Exactly Railway's `SETTLEMENT_TOKEN` |
| `SOLANA_RPC_URL` | A devnet HTTPS RPC endpoint, including its server-only credential |
| `WYSIWYS_DEPLOYMENT_PATH` | Leave unset to use the bundled `deployments/devnet.json` |
| `NEXT_PUBLIC_ENABLE_STANDARD_GROUPS` | Leave unset or `false` for the guarded demo |

Never add `NEXT_PUBLIC_` prefixes to credentials, the runner URL or its token. No CRE or settlement signing key belongs on Vercel. Signers use browser wallets. The public manifest is bundled by a static server import; Node API routes also trace the devnet file explicitly. Arbitrary filesystem overrides are for local operation unless their files are deliberately packaged.

4. Deploy. Request `/api/squads/config` and confirm its program and executor match the manifest. Request `/api/runner/status` and verify the Railway listener is healthy. In the browser, check the devnet label, connect a devnet wallet, create a treasury and execute a reviewed, voted payment. Payment and order state must agree with chain.
5. Configure preview deployments with separate devnet credentials or leave settlement disabled. Keep backend tokens out of source, build logs and browser network responses. An unavailable runner or CRE path leaves payments blocked.

## Trial usage

Keep the frontend on Vercel and use one Railway replica and one volume, without an extra database or Redis service. Watch patterns avoid rebuilding the runner for frontend-only edits. CRE simulation is serialized by the runner; avoid repeated manual simulations and startup churn. Use an existing live DON workflow if available to move compilation work off Railway. Sleeping stays disabled.

Monitor Railway's measured memory, CPU, egress and volume usage after one complete demo, then set usage alerts and an appropriate spending limit. The [trial currently limits runtime RAM to 1 GB](https://docs.railway.com/pricing/free-trial); run one complete CRE simulation and inspect peak memory before promising a live demo. If compilation exceeds that limit, use an already deployed live DON path or an account plan with adequate resources. Keep only necessary operational logs and avoid polling the UI unnecessarily. Check [volume limits](https://docs.railway.com/volumes/reference) and [pricing](https://docs.railway.com/pricing/plans). The $5 credit does not guarantee a particular number of days, especially with CRE compilation. Do not reduce backfill below the health contract or enable sleeping to make the trial last longer.

## Local checks

```bash
node --test deploy/railway/*.test.mjs
docker build -f deploy/railway/Dockerfile -t wysiwys-runner:devnet .
docker run --rm --entrypoint sh wysiwys-runner:devnet -c 'cre version && bun --version && cd workflow/confidential-preflight/review && bun test'
node deploy/railway/container-smoke.mjs wysiwys-runner:devnet
npm run typecheck
npm test
npm run build --workspace=app
```

The container smoke script uses disposable HTTP/WebSocket fixtures, a uniquely named container and volume, and a dummy bearer token. It verifies finalized subscription, health, denied anonymous order preparation and SQLite cursor persistence across restart, then removes only its own resources. Set `DOCKER_BIN` if Docker is not on your PATH. It does not establish outbound connectivity or a real CRE execution.

For a real devnet container run, mount a disposable volume at `/data`, supply variables with a gitignored environment file and map the port. Do not put real secret values into shell history. After restart, verify SQLite history and policy records persist, subscriptions resume, and finalized backfill catches missed events. Run a deliberate amount mismatch and a shared-order race only after the upgraded Guard is deployed. Record live URLs and transaction evidence when those checks succeed; configuration files alone are not deployment evidence.
