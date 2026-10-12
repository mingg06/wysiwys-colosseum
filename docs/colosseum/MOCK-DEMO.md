# Wysiwys mock demo guide

## Demo format

Record a two to three minute product walkthrough, followed by the verified local-validator proof. This path needs no Chainlink account, Railway runtime or public devnet SOL.

Use this caption at the start and beside the terminal:

> Local Solana validator. Mocked review delivery. Test keys only.

The Guard and Squads programs enforce the payments on the local validator. The test forwarder delivers a prepared APPROVED report. These tests do not run the CRE policy workflow, DON consensus or a TEE. The deployed frontend is a product walkthrough; its Railway payment backend is not running yet.

## Recording storyboard

| Time | Show | Say |
| --- | --- | --- |
| 0:00 to 0:20 | Wysiwys dashboard or a simple order diagram | “An exchange may operate several settlement vaults. Human approvals and a recipient whitelist do not identify whether the same business obligation has already been paid.” |
| 0:20 to 0:45 | Settlement orders form, or an explicitly labelled illustrative order card | “A separate back-office wallet authorizes exact payment terms and an approved source-vault set. Either eligible vault may settle the order once.” |
| 0:45 to 1:20 | Amount-mismatch test | “This payment has all human votes and a mocked Approved review. It differs from the authorized amount by one base unit. The Guard rejects it and preserves the order.” |
| 1:20 to 1:55 | Two-vault race test | “Both vaults submit against the same order. One succeeds. The recipient receives one payment, and the losing proposal remains unexecuted.” |
| 1:55 to 2:20 | Missing-votes rollback test | “A failed Squads execution consumes neither the review nor the order. After the votes arrive, the payment executes once.” |
| 2:20 to 2:40 | Closing product slide | “One business obligation, one settlement across approved vaults. Built for exchange settlement operations, OTC desks and stablecoin payment processors.” |

If the frontend cannot load a treasury, use a labelled illustrative diagram for the opening. Do not click through an unavailable backend or depict an unsigned form as an authorized order. The terminal provides the working payment proof.

## Exact scenarios in the existing tests

Verified on 13 October 2026 against the settlement implementation at commit `5b3f426`: all three selected tests passed in 23 seconds. Review delivery used the local test forwarder.

The focused run selects three tests from `tests/settlement_orders.ts`. Each test creates its own relevant order, so the examples below are separate scenarios.

| Scenario | Terms and action | Verified result |
| --- | --- | --- |
| Amount mismatch | Legacy SPL test token, 6 decimals. Order authorizes `1000000` base units; stored payment proposes `1000001`. Three votes and a mocked APPROVED review are present. | `SettlementMismatch`; recipient balance unchanged; order unconsumed; review still Approved. |
| Cross-vault race | A new SOL order authorizes `1000000` lamports, or `0.001 SOL`, with vault A and B both eligible. Both guarded transactions are submitted concurrently against that one order. | Exactly one succeeds; recipient balance increases by `1000000` lamports; reviews are one Executed and one Approved. |
| Rollback and replay | A new SPL order matches its payment, but votes are initially missing. Votes are then supplied and execution is retried. | Initial execution fails without consumption; subsequent execution consumes the order; a second proposal using it fails with `SettlementAlreadyConsumed`. |

A green test for a rejection means the test observed the expected failure and checked the unchanged state. Never describe that rejected payment as a successful transfer.

## Run on the current Windows workspace

The compatible Agave 4.3 validator and test helper were prepared for this workspace. If the validator is already running on port 8899, leave it running. Otherwise start it in a separate PowerShell terminal:

```powershell
wsl -d Ubuntu -- bash /mnt/d/wysiwys-colosseum/.scratch/validator.sh
```

Run the focused recording command in a second PowerShell terminal:

```powershell
wsl -d Ubuntu -- bash /mnt/d/wysiwys-colosseum/.scratch/settlement-demo.sh
```

The `.scratch` helpers are local and gitignored. They select the installed Node 22 runtime, Linux esbuild binary, local RPC and local test wallet. Keep private wallet files out of the recording.

For another machine with dependencies, the compatible validator, fixture programs and test wallet already prepared, run this from the repository root in Bash:

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET="$PWD/keys/local-validator.json"
export NODE_OPTIONS='--import tsx'
node node_modules/mocha/bin/mocha --exit -t 1000000 tests/settlement_orders.ts \
  --grep 'mismatched amount|two eligible vaults race|rolls back order consumption'
```

Use Agave 4.3 with this build; the previously installed Agave 3.1 cannot execute its SBPF output. A fresh machine also needs the Guard, test forwarder and Squads fixture programs loaded according to `Anchor.toml`. The fixture setup is local-only. Never deploy the test forwarder or the `short-policy-delay` build to devnet.

## Evidence and claims

Keep the terminal output and an uncut recording of the focused run. State the commit you tested. The mock path proves local on-chain order matching, shared consumption and atomic rollback. Hosted devnet execution, real CRE review delivery, provider quorum, DON consensus and confidential TEE execution need separate evidence.

For submission, describe the recording as a **working local-validator prototype with mocked review delivery**, and the Vercel URL as the frontend walkthrough until the backend and fresh devnet Guard are verified. Disclose the reused Origins foundation and identify settlement orders as the Colosseum addition.
