# Wysiwys Settlement

> One authorized obligation, one settlement across approved vaults.

Wysiwys adds enforceable settlement orders to its Solana treasury payment firewall. The target buyer is an exchange settlement team, an OTC desk or a stablecoin payment processor operating several vaults.

## Main addition

A separate back-office key authorizes a unique order with eligible source vaults, exact recipient and destination account, token, integer amount and deadline. Either approved vault can settle it once. The Guard checks the actual stored Squads payment against that authorization at execution.

Payment requires all three gates: the order matches, the current unexpired Guard review approves the stored transaction, and Squads has enough human approvals. The order and review are consumed atomically with payment. A failed transfer or missing vote consumes neither.

Order enforcement is enabled at creation of a new treasury. The authority and order terms are immutable. Existing treasuries keep their original review-and-vote flow. Order records are permanent, keyed by authority and order ID across treasuries. The feature cannot infer that two different IDs represent the same business obligation; the back office owns that mapping.

## Judge demo

1. Authorize an order for 100 units to an approved recipient, payable from vault A or B.
2. Propose 101 units from A. Obtain policy approval and every human vote. Execution fails because the exact amount differs.
3. Propose 100 units from both vaults under the same order. Approve both. Only one payment succeeds; the shared order is consumed.
4. Show that omitted orders fail and failed Squads execution leaves the order available.

The substantive change is shared on-chain enforcement of a business obligation across guarded vaults. API duplicate prevention already exists, including [Fireblocks external transaction IDs](https://fireblocks.readme.io/docs/manage-withdrawals-at-scale). Customer discovery must establish whether independent on-chain enforcement and shared vault coordination are valuable enough to adopt.

## Reused foundation and new work

The Origins build supplies Squads signing, deterministic SOL and legacy SPL decoding, Guard reviews, policy commitments and guarded execution. The Colosseum addition supplies back-office authorization, source-vault eligibility, exact order matching and permanent shared consumption. See the [implementation plan](../plans/2026-10-12-settlement-orders.md).

This is a devnet prototype. Prior live DON evidence does not establish live confidential TEE execution. See [production gaps](../production-gaps.md). Settlement terms are public on chain; keep invoices and customer identifiers off chain and submit hashed order IDs. An independent key does not prove organizational independence.

## Submission and hosting

Disclose the reused Origins work and identify subsequent development clearly. Prepare a public repository, a presentation, a separate product demo, team details, demand-validation evidence and a distribution plan. Verify dates, prizes and eligibility against [Colosseum's official event page](https://colosseum.com/worldsfair) before submitting; no prize or eligibility claim is made here.

Railway can host the app and runner as separate services, with persistent storage for runner history and policy documents. Solana execution stays on devnet. Trial limits and CRE availability must be checked during deployment. Hosting and a working live demo are separate completion checks from local implementation.
