# Wysiwys Settlement

> One authorized obligation, one settlement across approved vaults.

Wysiwys adds enforceable settlement orders to its Solana treasury payment firewall. The target buyer is an exchange settlement team, an OTC desk or a stablecoin payment processor operating several vaults.

## Main addition

A separate back-office key authorizes a unique order with eligible source vaults, exact recipient and destination account, token, integer amount and deadline. Either approved vault can settle it once. The Guard checks the actual stored Squads payment against that authorization at execution.

Payment requires all three gates: the order matches, the current unexpired Guard review approves the stored transaction, and Squads has enough human approvals. The order and review are consumed atomically with payment. A failed transfer or missing vote consumes neither.

Order enforcement is enabled at creation of a new treasury. The authority and order terms are immutable. Existing treasuries keep their original review-and-vote flow. Order records are permanent, keyed by authority and order ID across treasuries. The feature cannot infer that two different IDs represent the same business obligation; the back office owns that mapping.

## Judge demo

Without Chainlink account access, use the [mock demo recording guide](MOCK-DEMO.md). It uses the existing local-validator tests and a mock review forwarder, with clear trust labels.

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

Vercel hosts the Next.js frontend and its existing API routes. One continuous Railway service runs the finalized listener, runner and CRE triggering, with SQLite on a persistent volume and sleeping disabled. The browser continues to call Next.js, which authenticates calls to Railway. Solana execution stays on devnet. See [exact setup and variables](../../deploy/README.md). Full Trial network access and an actual CRE execution must be verified in the hosted account.

## Run the demo

1. Upgrade the devnet Guard with the normal build and configure the review path using the deployment guide. Start from two new treasuries. In **Create treasury**, set the same separate back-office authority on both before making any proposals. The creator and members must be different wallets from that authority. Order-enabled creation supports up to eight invited members.
2. Configure each treasury's policy to allow the same test recipient and a cap above both demo amounts. For legacy SPL, use the configured devnet test mint and an existing valid recipient token account. Fund both vaults and record their **vault addresses**, not their multisig or token account addresses.
3. Connect the back-office wallet and open **Settlement orders**. Authorize one ID with both vault addresses, the exact recipient and destination, amount `1000000` base units (1 token with 6 decimals), and a future deadline. The back-office wallet needs devnet SOL for rent and fees. Keep customer identifiers off chain; use an opaque ID rather than an invoice or customer name.
4. Connect the treasury member wallets. Propose 1.01 tokens from A, obtain an Approved policy review and all votes, then enter the same order ID on its review page and execute. Expect `SettlementMismatch`, no payout, and no consumption.
5. Propose exactly 1 token from A and B. Obtain current reviews and every required vote on both. Enter the same ID when executing both proposals. Only one can pay; the second fails with `SettlementAlreadyConsumed`. Read the order to show its consumed state, winning treasury, proposal index and stored transaction hash. A wallet UI may simulate and reject the losing attempt before submission; the local-validator test also verifies concurrent submitted transactions.
6. Record the actual devnet transaction signatures and balances. Existing local-validator tests cover the mismatch, two-vault race, expiry, missing order, wrong authority and rollback; their mock forwarder is not live DON evidence.
