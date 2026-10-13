# Fresh CRE review deployment

Continue the user's authorized devnet deployment against the existing verified Guard. Do not deploy another Guard, change the frozen shared contracts or weaken execution checks. Do not commit or push without a new explicit request.

## Completed setup

- The user funded the separate local setup payer with 1 devnet SOL from Phantom. Its private key stays in `keys/cre-setup-payer.json`; the Phantom key was not exported.
- Bootstrap created `deployments/devnet.fresh-20261013.json` with fresh test assets and a three-of-three autonomous Squads treasury. The executor derived under the new Guard is its sole Execute member. Generated test voters are separate from the user's Phantom funding wallet.
- Finalized verification checked the multisig, fresh executor/config derivations, legacy mint, funded vault token account, clean token authorities and live forwarder program/state. Evidence: `evidence/deploy/2026-10-13-fresh-treasury.json`.
- The named treasury's GuardConfig is initialized and matches the selected live forwarder, supplied owner and decoder-bound private policy. Finalized verification is in `evidence/deploy/2026-10-13-live-guard-config.json`. Active and live manifests were published after the finalized live review and payout.
- A dedicated runner trigger identity was generated locally in `keys/cre-gateway.json`; only its public address is in the live config. The runtime must consume the private key opaquely. Never print or commit it.
- The three-provider CRE network probe and confidential screening preflight passed locally. The 83 review fixture tests, review typecheck and active deployment configuration checks pass.

## Selected inputs

The user selected ordinary DON execution and approved the generated demo recipient, fresh legacy mUSD mint and Scorechain screening. After the recommendation of a 1,000 mUSD per-payment cap, the user instructed deployment; this is the selected cap. The policy permits only `spl-token:transferChecked` for that mint and was validated with `parsePolicy` without displaying the document. Its public commitment is `0c35c6cdbf11dd50726384ad7537a7b60fc10207514c7f41759c8178be7daa9f`. Ordinary DON execution exposes policy data to node operators. No live TEE confidentiality or enrollment is claimed.

The user supplied Organization address `0x0d06e59bb559ac627dba186e3d446865cea4bb79`. The authenticated deploy and workflow-get commands verified this actual organization owner, matching GuardConfig. The HTTP trigger signer remains a separate identity. Five required secrets were uploaded to that owner's Vault: three RPC endpoints, the private policy and the screening key. No secret values were displayed.

The initial clean request, index 1, expired during setup. Its public identifiers are in `evidence/cre/2026-10-13-dryrun-review-request.json`. It was used only for the native receiver-free diagnostic. A fresh index 2 was used for the live report and payout.

## Completed sequence

1. Prepared and validated the exact private policy through `packages/shared` without displaying it, then computed its decoder-bound commitment. The existing policy registry CLI configured the ignored CRE environment.
2. Initialized and finalized-chain-verified GuardConfig with the production forwarder, supplied organization owner and positive lifetime/deadline values. No frozen layout or security rule changed.
3. Proposed a clean payment and created an identifiers-only trigger file.
4. Ran the full native diagnostic from `workflow/confidential-preflight` before deployment:

```powershell
cre workflow simulate review --target local-simulation --config C:/Users/jerzl/wysiwys-colosseum/.scratch/review-don-local.json --non-interactive --trigger-index 0 --http-payload C:/Users/jerzl/wysiwys-colosseum/.scratch/review-trigger.json --wasm C:/Users/jerzl/wysiwys-colosseum/.scratch/review.wasm
```

The config override copies the receiver-free local config with `execution: "don"`. It exercised the selected live handler and returned approve/reason 0, with `withinDeadline: false` and `reportSubmitted: false`. All three providers agreed on both account reads. The prebuilt WASM is the unchanged, successfully compiled review source, also used for deployment.

5. Uploaded five required secrets using the CRE browser-auth CLI, which consumed ignored local configuration opaquely. The initial Vault authorization was denied; the retry succeeded. The CLI used its default gateway validation mode, which does not independently verify the gateway's encryption key and response signatures. This is not enclave attestation.
6. Deployed `wysiwys-review-live` to `live-devnet`, private registry, ordinary DON family `zone-a`, using `cre workflow deploy review --target live-devnet --non-interactive --yes --wasm C:/Users/jerzl/wysiwys-colosseum/.scratch/review.wasm`. The authenticated CLI verified ACTIVE status, organization owner and workflow ID `00e5b1f7c6880ef5c268817a96194b378226f602d824b8b7c144b90df5102b5c`. Evidence: `evidence/cre/2026-10-13-live-workflow.json`.
7. Proposed fresh index 2 and triggered it using the runner's tested `GatewayTrigger` and dedicated local signing key. CRE execution `618bfb9f-5d06-49cb-ae25-0d5dd85b087b` completed SUCCESS. Finalized chain verification confirmed APPROVED/reason 0, the transaction/policy/destination bindings, and production forwarder CPI into the Guard. Evidence: `evidence/cre/2026-10-13-live-review-decision.json`.
8. Three generated test voters approved, then the existing finish script executed through the Guard. Finalized state verified Review Executed, Squads Executed, three approvals and a 250 mUSD payout with the matching vault debit. Both forwarder registry entries were verified before publishing active/live/fresh manifests. Evidence: `evidence/cre/2026-10-13-live-payment.json`. The final deployment configuration tests passed (3/3).

## Hosting remains separate

Railway runner activation and Vercel hookup remain pending the teammate runbook's prerequisites. Configure the deployed workflow ID and the dedicated caller key opaquely on the runner. A matching Vault document currently serves this policy; policy changes need the hosted content-addressed store and its matching `POLICY_STORE_TOKEN`/`POLICY_FETCH_TOKEN`. Neither the hosted policy store nor that fallback token was provisioned in this CRE deployment.

The fresh bootstrap treasury has no SettlementBinding. It must not be described as settlement-order protected.
