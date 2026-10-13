# Continue the fresh devnet deployment

The Guard is already deployed on Solana devnet at `CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S`. Upgrade authority is the fresh deployer `Cbfkee83NPThVWNZ488BkN9sEQWsC54jpDK2weVhjtN7`. Public verification is in `evidence/deploy/2026-10-13-guard-devnet.json`. Do not deploy a replacement program just to configure CRE.

The shared IDL, Guard source, Anchor config and review targets name this Guard. Its IDL schema is unchanged. `deployments/devnet.json`, `deployments/devnet.live.json` and the named fresh manifest now contain the initialized, finalized-chain-verified treasury. `deployments/devnet.historical.json` preserves the old treasury for recorded fixture tests; do not use its executor/config PDAs with the new Guard.

The 13 October CRE deployment is complete: `wysiwys-review-live` is Active on ordinary DON, workflow ID `00e5b1f7c6880ef5c268817a96194b378226f602d824b8b7c144b90df5102b5c`, organization owner `0x0D06E59BB559Ac627dBa186E3D446865ceA4bb79`. Five required Vault secrets are uploaded. A fresh live report approved transaction index 2, followed by three votes and a finalized 250 mUSD guarded payout. See `evidence/cre/2026-10-13-live-payment.json` and `deploy/STATUS.md`. No TEE attestation is claimed. The following provisioning steps remain a guide for recreating setup; continue with hosting for this existing deployment. The policy-store fallback token and hosted store still need configuration for policy changes.

## 1. Prepare a clean workspace and private inputs

Use a clean clone of the pushed `main` branch, with Node 22.13+, Agave 4.3+, Anchor 1.2.0, Bun and CRE CLI 1.35.0. Solami is deferred: all RPC endpoints must be devnet, using QuickNode, Helius and Alchemy. Keep Railway running continuously with sleeping disabled.

Obtain only the fresh devnet deployment keypairs from the owner through a secure channel if you need them: `keys/devnet-deployer.json`, `keys/guard-program.json` and the independent `keys/settlement-authority.json`. The already deployed program does not require its program keypair for ordinary treasury creation. Never copy the historical multisig-create/mint keys into this clean workspace. Never commit keypairs, .env files, private policies or API keys.

```bash
npm install
cp .env.example .env
cp workflow/confidential-preflight/.env.example workflow/confidential-preflight/.env
```

Fill the files locally, without pasting keys into chat. Root `.env` needs `HELIUS_DEVNET_RPC_URL`, optional explicit `HELIUS_DEVNET_WS_URL`, and `SOLANA_WALLET` pointing to the devnet payer file. The CRE project's ignored `.env` needs the three `CRE_*_SOLANA_DEVNET_RPC_URL` values plus the chosen path's policy, screening and authentication inputs. `CRE_SOLANA_PRIVATE_KEY` is a funded devnet transmitter; `CRE_ETH_PRIVATE_KEY` is the CLI's throwaway EVM requirement. Neither is a treasury signing key.

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

Authenticate CRE using the teammate's own account. For a live workflow, verify that `authorizedKeys` in `review/config.live.json` names the actual EVM address that signs the authenticated runner trigger. The 13 October setup replaced the invalid placeholder with a new dedicated devnet caller; its private key remains local and gitignored. A different runner must supply its own caller address and matching private key. Do not substitute the historical trigger key or Guard workflow owner. Confirm the Railway policy-store URL is the actual running service and set the matching `POLICY_STORE_TOKEN` secret when using that store.

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

Use `deploy/README.md` and `deploy/railway/.env.example`. Railway is staged, not running: one runner service, one 500 MB `/data` volume, port 8787, one replica, sleeping disabled. Confirm Full Trial/outbound access. Supply secrets directly in Railway, never through Git. The staged source is still pinned to old commit `5b3f426`; update it to the reviewed commit containing the completed fresh manifest before activation.

For simulation keep `CRE_PROJECT_DIR=/opt/wysiwys/workflow/confidential-preflight`, target `staging-settings` and broadcasting enabled. For live DON clear `CRE_PROJECT_DIR`, configure the actual `CRE_WORKFLOW_ID` and `CRE_GATEWAY_PRIVATE_KEY`, and upload the workflow secrets through the teammate's CRE account. Keep `SETTLEMENT_TOKEN` equal to Vercel's `WYSIWYS_SETTLEMENT_TOKEN`. Keep `POLICY_FETCH_TOKEN` equal to CRE's `POLICY_STORE_TOKEN` when using the runner policy store.

After applying the reviewed Railway patch, run `node deploy/railway/check-connectivity.mjs` in the service shell. Verify `/status` returns 200 with finalized subscription and recent backfill. Confirm SQLite and policy storage survive restart. Rebuild/redeploy Vercel only with the same verified active manifest and server-only RPC/runner variables.

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
