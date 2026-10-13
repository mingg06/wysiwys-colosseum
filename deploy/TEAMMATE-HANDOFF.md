# Teammate handoff: deploy Railway, connect Vercel, verify the browser flow

Updated 13 October 2026. **For the running demo, start with [DEMO-READY.md](DEMO-READY.md).** Railway and Vercel now run commit `2d07a15`; the clean listener-triggered live payment and deployed UI are verified. Section 5 remains the hosting setup/reference checklist, with restart persistence, browser-origin signing and the remaining live scenarios still separate checks. Guard deployment, fresh treasury bootstrap, CRE deployment and the clean live DON payment are complete. Sections 1 to 4 are provisioning references, not instructions to repeat the completed setup. Preserve the existing Guard, assets, policy commitment and caller identity.

Deployment commit `32428a858909064d7f64870bfbabe796bd90663e` is pushed to `main` at https://github.com/mingg06/wysiwys-colosseum. Deploy a reviewed `main` commit containing it and any subsequent hosting fixes. Hosting is now integrated; see the current status and demo guide before repeating setup.

The Guard is already deployed on Solana devnet at `CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S`. Upgrade authority is the fresh deployer `Cbfkee83NPThVWNZ488BkN9sEQWsC54jpDK2weVhjtN7`. Public verification is in `evidence/deploy/2026-10-13-guard-devnet.json`. Do not deploy a replacement program just to configure CRE.

The shared IDL, Guard source, Anchor config and review targets name this Guard. Its IDL schema is unchanged. `deployments/devnet.json`, `deployments/devnet.live.json` and the named fresh manifest now contain the initialized, finalized-chain-verified treasury. `deployments/devnet.historical.json` preserves the old treasury for recorded fixture tests; do not use its executor/config PDAs with the new Guard.

The 13 October CRE deployment is complete: `wysiwys-review-live` is Active on ordinary DON, workflow ID `00e5b1f7c6880ef5c268817a96194b378226f602d824b8b7c144b90df5102b5c`, organization owner `0x0D06E59BB559Ac627dBa186E3D446865ceA4bb79`. Five required Vault secrets are uploaded. A fresh live report approved transaction index 2, followed by three votes and a finalized 250 mUSD guarded payout. See `evidence/cre/2026-10-13-live-payment.json` and `deploy/STATUS.md`. No TEE attestation is claimed. The following provisioning steps remain a guide for recreating setup; continue with hosting for this existing deployment. The current policy is registered in the hosted store. The Vault policy-store fallback token still needs verification before demonstrating custom policies or voted changes.

## 1. Prepare a clean workspace and private inputs

Use a clean clone of the pushed `main` branch, with Node 22.13+, Agave 4.3+, Anchor 1.2.0, Bun and CRE CLI 1.35.0. Solami is deferred: all RPC endpoints must be devnet, using QuickNode, Helius and Alchemy. Keep Railway running continuously with sleeping disabled.

Obtain only the fresh devnet deployment keypairs from the owner through a secure channel if you need them: `keys/devnet-deployer.json`, `keys/guard-program.json` and the independent `keys/settlement-authority.json`. The already deployed program does not require its program keypair for ordinary treasury creation. Never copy the historical multisig-create/mint keys into this clean workspace. Never commit keypairs, .env files, private policies or API keys.

```bash
npm install
cp .env.example .env
cp workflow/confidential-preflight/.env.example workflow/confidential-preflight/.env
```

Fill the files locally, without pasting keys into chat. Root `.env` needs `HELIUS_DEVNET_RPC_URL`, optional explicit `HELIUS_DEVNET_WS_URL`, and `SOLANA_WALLET` pointing to the devnet payer file when using setup scripts. The CRE project's ignored `.env` needs the three `CRE_*_SOLANA_DEVNET_RPC_URL` values plus the chosen path's policy and screening inputs. A funded `CRE_SOLANA_PRIVATE_KEY` is for mock broadcast simulation only. Private-registry deployment on the verified CLI v1.37 uses account authentication and does not require `CRE_ETH_PRIVATE_KEY`; non-broadcast simulation can use its default key. Live DON uses its own transmitter. None of these belong to browser treasury signers.

Check the payer balance and the deployed Guard:

```bash
solana --version
solana balance --keypair keys/devnet-deployer.json --url devnet
solana program show CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S --url devnet
```

Bootstrap requires at least 0.5 devnet SOL in the payer. Additional funding may be needed for account creation and report transactions. Do not assume the program's rent balance is spendable wallet SOL.

## 2. Bootstrap fresh test assets, then initialize the policy-bound Guard

Use a new treasury name. For the first run, leave all `GUARD_*` CRE configuration inputs unset. This creates an executor-only guarded Squads treasury and test assets but skips GuardConfig initialization; payments remain unavailable. The named output does not overwrite the active manifest.

```bash
export SOLANA_WALLET="$PWD/keys/devnet-deployer.json"
npx tsx scripts/bootstrap-devnet.ts --treasury fresh-20261013
```

Create ignored `workflow/policy.json` from the versioned policy example, replacing its illustrative mint, salt, whitelist and limits with the intentionally approved private rules for this fresh treasury. `parsePolicy` is the validator; do not reuse a historical policy hash without its exact document. Use the fresh named manifest to identify the test mint and candidate recipient accounts. Keep the policy private. Compute its commitment:

```bash
npx tsx scripts/policy-hash.ts workflow/policy.json
```

Put that exact hash in root `GUARD_POLICY_HASH`. Choose the report path before initializing:

| Path | Root Guard inputs and CRE target | What it proves |
| --- | --- | --- |
| CRE simulator | Verify the mock forwarder program/state from `review/config.staging.json`; configure its actual simulator workflow owner; use `staging-settings` | Real devnet writes through the mock forwarder. No live DON signatures or TEE attestation. |
| Live DON | Verify the production forwarder program/state from `review/config.live.json`; configure the teammate's actual CRE workflow owner; use `live-devnet` | Requires usable CRE deployment access and verified provenance on the Solana forwarder path. |

Set `GUARD_FORWARDER_PROGRAM`, `GUARD_FORWARDER_STATE`, `GUARD_WORKFLOW_OWNER` (20-byte EVM address, hex), `GUARD_POLICY_HASH`, `GUARD_MAX_REVIEW_LIFETIME` and `GUARD_REVIEW_DEADLINE_SECS` for that path. The workflow owner is different from the authorized HTTP trigger signer. Keep durations positive and consistent with the report expiry. These values are immutable for the treasury except for the voted policy-hash change.

Load the exact private document into the CRE `POLICY_DOCUMENT` secret (through `CRE_POLICY_DOCUMENT` for simulation) or the content-addressed runner policy store. If screening is enabled, supply its working secret. Missing policy or screening service access must block approval.

Rerun bootstrap with the same new name to initialize GuardConfig:

```bash
npx tsx scripts/bootstrap-devnet.ts --treasury fresh-20261013
```

The script checks existing state and refuses mismatched Guard values or unsafe Squads members. Inspect the named output: `programId` must equal the verified Guard, `guard` must be non-null and its committed values must match the selected CRE path.

## 3. Publish only a verified fresh manifest

After GuardConfig exists, replace the active manifest with the named bootstrap result. Preserve the forwarder registry used for runner path filtering, after verifying those programs and states against devnet. This registry is historical infrastructure configuration, not the old treasury's GuardConfig or executor.

```bash
python3 - <<'PY'
import json
from pathlib import Path
fresh_path = Path('deployments/devnet.fresh-20261013.json')
current = json.loads(Path('deployments/devnet.json').read_text())
fresh = json.loads(fresh_path.read_text())
assert fresh['cluster'] == 'devnet'
assert fresh['programId'] == current['programId']
assert fresh.get('guard'), 'GuardConfig must exist first'
historical = json.loads(Path('deployments/devnet.historical.json').read_text())
fresh['forwarders'] = historical['forwarders']
fresh_path.write_text(json.dumps(fresh, indent=2) + '\n')
Path('deployments/devnet.json').write_text(json.dumps(fresh, indent=2) + '\n')
PY
node --import tsx --test deploy/devnet-config.test.mjs
```

The configuration check derives executor/config PDAs under the new Guard and rejects reused old-Guard addresses. Review public output for confidential information before publishing any new manifest; the private policy never belongs in it.

## 4. Verify the CRE workflow before activation

For this existing deployment, authenticate as a member of the existing organization `originshack` (`org_L1ozCyAav2jsQEhH`), which owns the deployed workflow. A different organization would have a different owner and cannot reuse the immutable Guard binding. Preserve `authorizedKeys` in `review/config.live.json` and provision its matching dedicated caller key privately on Railway. The caller is not the organization owner or a treasury signing wallet. Changing caller identity requires a deliberate configuration update and fresh simulation before redeployment. Confirm the configured Railway policy-store origin is working and set its matching `POLICY_STORE_TOKEN` secret when using that store.

Install and test the pinned review project:

```bash
cd workflow/confidential-preflight/review
bun install --frozen-lockfile
bun test
bun run typecheck
cd ../../..
```

Propose one payment without delivering a report yet:

```bash
export WYSIWYS_DEPLOYMENT=deployments/devnet.fresh-20261013.json
npx tsx scripts/propose-devnet.ts clean
```

Run `mkdir -p .scratch`. Use the proposal's public `multisig` and `txIndex` output to create `.scratch/review-trigger.json` containing only those two identifier strings. No policy or credentials belong in this trigger. From the CRE project root, first run the receiver-free, non-broadcast diagnostic:

```bash
cd workflow/confidential-preflight
cre workflow simulate review --target local-simulation --non-interactive \
  --trigger-index 0 --http-payload ../../.scratch/review-trigger.json
```

This verifies real reads/decoding/policy evaluation, without generating or submitting a report. Save sanitized output in `evidence/cre/`. A missing policy, wrong network, failed quorum or screening outage must never fall back to approval.

For the simulator path, after the dry run and after reviewing the immutable Guard inputs, broadcast the same pending request:

```bash
cre workflow simulate review --target staging-settings --non-interactive \
  --trigger-index 0 --broadcast --http-payload ../../.scratch/review-trigger.json
```

For live DON, configure the actual deployment account's secrets and deploy the updated `live-devnet` target only after a successful dry run and verified forwarder provenance. From the same CRE project root, these are the teammate's explicit account operations:

```bash
cre secrets create review-secrets.yaml --target live-devnet --secrets-auth browser
cre workflow deploy review --target live-devnet --non-interactive --yes
```

Secrets and workflow deployment are separate writes; review the actual account, workflow owner, trigger address and consumer before each. The live config uses `execution: don`; policy secrets are visible to DON node operators. Do not claim confidential execution or TEE attestation without separately verified enrollment/evidence. Record the actual workflow ID; the old workflow pinned to the old Guard is unsuitable.

Once the review is Approved on chain, return to the repository root and vote/execute the test payment:

```bash
cd ../..
npx tsx scripts/finish-devnet.ts TRANSACTION_INDEX_FROM_PROPOSE_OUTPUT
```

Replace the argument with the actual returned transaction index. Decided or expired reviews cannot be reused for a new authorization. `scripts/e2e-devnet.ts` uses a local stand-in review and must not be presented as CRE delivery evidence.

## 5. Activate Railway and Vercel

### Current public checks and expected configuration

Observed at **13:28 Asia/Kuala_Lumpur on 13 October 2026**; see [hosting readiness evidence](../evidence/deploy/2026-10-13-hosting-readiness.json):

| Endpoint | Observed | Required after hosting |
| --- | --- | --- |
| `https://runner-production-1e71.up.railway.app/status` | HTTP 404 | HTTP 200, finalized subscription and recent backfill |
| `https://wysiwys-colosseum.vercel.app/api/runner/status` | HTTP 503, unhealthy backend | HTTP 200, healthy runner |
| `https://wysiwys-colosseum.vercel.app/api/squads/config` | HTTP 200, historical Guard/treasury | Fresh active manifest values |

The frontend still names historical multisig `Boz5Dukxrwi5MGRam8bGimokhZwFRLHFdVeEsjaTLgPH` and Guard `9wCcjb74o2cWcFx8GimQQMcR1nJay9X86v1JiyV9kwya`. Recheck dashboard source commits and any deployment-path override; these public responses do not establish the current dashboard deployment or staged changes.

The required fresh values are Guard `CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S`, multisig `CPKo7rv7raj27CU3wXjhKbpxxt3EQoebbQXy88uUGnbb`, and executor `FQTfMTJeawUuh9ZwBCpFwXh68BcN7otgHEucCgAV1Dpp`. Read remaining addresses and immutable Guard values from `deployments/devnet.json`.

### Private inputs to obtain securely

- Railway project/environment and Vercel production-project access. Confirm Railway Full Trial or the applicable plan permits outbound RPC/WebSocket/gateway traffic.
- Working Helius devnet HTTPS/WSS credentials for the runner. Workflow RPC and screening secrets are already in CRE Vault; live-only triggering does not need them copied to Railway.
- Existing dedicated caller key from ignored `keys/cre-gateway.json`. Load its `privateKey` field into Railway's secret variable opaquely over encrypted transport. Verify only its public address: `0xb1E3d6A0342bE079624CA5F278c29851c1570721`. Never print the key, paste it in chat, or put it in shell arguments.
- Exact private `workflow/policy.json` or matching document in `workflow/policies/` for runner registration. Obtain it securely from the owner; do not reconstruct it from the hash or regenerate its salt.
- Independent random server tokens supplied through secret inputs: one shared only by Railway/Vercel settlement routes, and one shared only by Railway/CRE policy fetching. Optional manual-review/admin tokens should be separate.

Treasury signer keys and the Guard upgrade key are not hosting inputs. The Phantom funding wallet is not one of the existing demo's three generated voters. For browser testing use actual member wallets, or create a new guarded treasury with teammate-controlled devnet wallets after policy storage works. Arrange the configured mUSD funding with the owner. Browser wallets sign; the runner builds instructions.

### A. Deploy the existing Railway service in live mode

Use [deployment setup](README.md), [.railway/railway.ts](../.railway/railway.ts) and the variable names in `deploy/railway/.env.example`. The existing project is `8feb4d17-a2fa-45c2-8753-517516756136`, production environment `02bc742f-095d-4223-b8a2-e6d36b928588`, runner service `1c572cbd-e708-4646-ba53-f72a9dce7e24`. Re-inspect its staged changes before applying them. The last inspected source pin was `5b3f426`; update it to the reviewed commit containing the fresh deployment. Preserve the service and volume rather than creating duplicates.

Use repository-root `deploy/railway/Dockerfile`, one replica, one 500 MB volume at `/data`, `/status` healthcheck and **sleeping/serverless disabled**. Leave the deprecated Railway Config File setting unset. The default image sets simulator environment defaults, so explicitly override `CRE_PROJECT_DIR` to empty. The Dockerfile has a `live` stage for platforms with a supported build-target setting; do not assume an unverified Railway target flag.

| Railway variable | Setting |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `8787`; public domain target port must match |
| `RUNNER_DB_PATH` | `/data/runner.db` |
| `BACKFILL_INTERVAL_MS` | `60000` |
| `HELIUS_DEVNET_RPC_URL`, `HELIUS_DEVNET_WS_URL` | Private working devnet endpoints |
| `CRE_PROJECT_DIR` | Empty, overriding the image's simulator default |
| `CRE_WORKFLOW_ID` | `00e5b1f7c6880ef5c268817a96194b378226f602d824b8b7c144b90df5102b5c` |
| `CRE_GATEWAY_PRIVATE_KEY` | Existing dedicated caller key, supplied privately |
| `CRE_GATEWAY_URL` | `https://01.gateway.zone-a.cre.chain.link` |
| `SETTLEMENT_TOKEN` | Same private token as Vercel `WYSIWYS_SETTLEMENT_TOKEN` |
| `POLICY_FETCH_TOKEN` | Same private token as CRE Vault `POLICY_STORE_TOKEN` |
| `REVIEW_TOKEN` | Optional independent token for manual pending-review retries |
| `ADMIN_TOKEN` | Optional; unnecessary for live-only mode |

Leave `CRE_TRIGGER_URL` and `CRE_TRIGGER_TOKEN` unset. Pure live triggering requires no simulator API key, local Solana transmitter or treasury keypairs. The five workflow secrets are already uploaded to the correct organization's Vault.

If using the CLI/IaC path, authenticate/link the existing project/environment, run `npm ci --prefix .railway`, then review `railway config plan` before `railway config apply`. Preserve secrets, avoid unintended deletions and update the source pin separately as the specification requires.

After deployment, run `node deploy/railway/check-connectivity.mjs` inside the service. Require correct devnet genesis, acknowledged finalized `logsSubscribe` and gateway reachability. The helper permits unset workflow RPC variables in live-only mode. `/status` must return 200 with recent backfill and `reviewPath.mode` equal to `live`. Gateway reachability alone does not prove trigger authentication or delivery.

### B. Register the initial policy and enable policy fetch

**Live-only seeding detail:** `services/runner/src/index.ts` calls `seedPolicies` only when `cfg.cre` exists; the container writes its CRE environment only when `CRE_PROJECT_DIR` is set. With that variable empty, merely setting `CRE_POLICY_DOCUMENT` on Railway will not populate SQLite. Register the approved document explicitly rather than enabling the simulator for seeding.

Use authenticated `POST /frontend/policies/register`, bearer `SETTLEMENT_TOKEN`, body `{ "document": <exact private policy object> }`, through an opaque local tool or secret-aware operator path over HTTPS. Do not print the document/token or place them in arguments. Require the returned public hash to equal `0c35c6cdbf11dd50726384ad7537a7b60fc10207514c7f41759c8178be7daa9f`. Verify the record persists in `/data/runner.db`.

Configure Railway `POLICY_FETCH_TOKEN`, then create only the matching new CRE Vault secret `POLICY_STORE_TOKEN` in the existing organization. Do not bulk-create the five secrets that already exist. Create the repo-root `.scratch` directory if absent. An ignored reference-only `.scratch/policy-store-secrets.yaml` can contain:

```yaml
secretsNames:
  POLICY_STORE_TOKEN:
    - CRE_POLICY_STORE_TOKEN
```

Supply `CRE_POLICY_STORE_TOKEN` privately to the CLI environment, ensuring the ignored project `.env` has no conflicting blank/stale value. From `workflow/confidential-preflight`, run as a member of the existing organization:

```bash
cre secrets create ../../.scratch/policy-store-secrets.yaml --target live-devnet --secrets-auth browser --non-interactive --yes
```

Complete browser authorization if requested. The deployed workflow already requests this secret name and its `policyStoreUrl` is `https://runner-production-1e71.up.railway.app`. Keep that origin working. A different origin requires a deliberate workflow config change and native non-broadcast simulation before redeployment. Adding this secret does not require reactivating the already Active workflow.

Test authorized policy retrieval without displaying the returned document; validate its shared `parsePolicy` format and decoder-bound hash opaquely. Anonymous retrieval must fail. Initial registration enables default-policy treasury creation. Working policy fetch is required for custom policies and voted changes not present in the existing Vault document.

### C. Connect and redeploy Vercel

Existing project `wysiwys-colosseum` (`prj_AW3G6XtSyEHJcuTBf2ozAajHQ7eC`), production URL `https://wysiwys-colosseum.vercel.app`. Deploy the reviewed `main` commit containing the fresh manifest. Set Root Directory to `app`, include source files outside that root, and use `app/vercel.json` with Node 22.x.

| Vercel production variable | Setting |
| --- | --- |
| `WYSIWYS_SETTLEMENT_URL` | `https://runner-production-1e71.up.railway.app`, once healthy |
| `WYSIWYS_SETTLEMENT_TOKEN` | Identical to Railway `SETTLEMENT_TOKEN` |
| `SOLANA_RPC_URL` | Private working devnet HTTPS endpoint |
| `WYSIWYS_DEPLOYMENT_PATH` | Unset, to bundle current `deployments/devnet.json` |
| `NEXT_PUBLIC_ENABLE_STANDARD_GROUPS` | Unset or `false` |

Keep credentials server-only; no caller key, treasury keypair or policy document belongs on Vercel. Redeploy after environment/source changes. `/api/squads/config` returns nested `config.guardProgram`, `config.multisig` and `config.executor`: require the fresh values above. `/api/runner/status` must return HTTP 200 with healthy listener. Resolve old source deployments/path overrides until production stops serving the historical treasury.

### D. Hosted acceptance and persistence

With member wallets on devnet and the configured test mint, propose a new 250 mUSD clean payment through the app. Its finalized `request_review` event must automatically trigger CRE through the hosted listener, without a local/manual trigger. Verify CRE execution, a finalized APPROVED on-chain Review, required votes and guarded execution. Votes may precede or follow review; the verdict alone cannot execute a payment. Keep the visible **Devnet, test keys only** label.

Record source commit, public URLs, workflow execution ID and proposal/report/execute signatures in `evidence/`. Require Review Executed, matching recipient/vault balance changes, and replay refusal. Restart/redeploy the runner with its volume preserved; require healthy subscription/backfill and retained history, policy records and cursor, with no duplicate payout. Confirm anonymous frontend preparation and policy fetch fail. Any RPC, listener, gateway, policy or report error keeps payments blocked; no mock approval fallback.

Then record the remaining adversarial demo scenarios in section 6 as they are actually exercised. Keep settlement-order tests separate: the existing bootstrap treasury is unbound. Update `deploy/STATUS.md` with actual hosted source commits, health, persistence and payment evidence. Follow repository TDD for implementation changes and seek agreement before changing frozen contracts or security/policy layers. Commit/push only when explicitly requested.

## 6. Settlement-order demo and recording

The bootstrap test treasury is the legacy review-gated payment proof; bootstrap does not initialize a SettlementBinding. For the settlement-order addition, create fresh opt-in groups from the app with the independent back-office authority selected before their first proposal. Verify it is not a Squads member or executor. Have that authority authorize the exact order terms and source-vault set, then test an amount mismatch, two eligible vaults racing the same order and rollback on missing votes. Do not label an unbound treasury as settlement protected.

Record clean execution, lookalike rejection, authority-change rejection, changed destination ownership and durable-nonce refusal. Keep separate evidence for provider quorum, mock report delivery, live DON and TEE attestation. Only an unexpired current APPROVED review plus the Squads votes and any required settlement order may execute.

## Code checks available now

```bash
npm test
npm run typecheck
npm run build --workspace=app
node --import tsx --test deploy/devnet-config.test.mjs
node --import tsx --test .railway/config.test.mjs
node --test deploy/railway/runtime-env.test.mjs deploy/railway/connectivity.test.mjs
# Linux/WSL: uses fake CLI tools; no keys, network or deployment.
node --test deploy/guard-deploy.test.mjs
```

The deployment helper now defaults to the fresh keypairs and requires Agave >= 4.3, the devnet genesis hash and a program keypair matching the active manifest. It does not bypass feature verification. The Guard is already deployed; only run the helper for an intentionally reviewed upgrade, never to resolve missing CRE credentials.
