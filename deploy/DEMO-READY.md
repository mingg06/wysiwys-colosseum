# Hosted devnet demo

Open [the demo treasury](https://wysiwys-colosseum.vercel.app/?group=CPKo7rv7raj27CU3wXjhKbpxxt3EQoebbQXy88uUGnbb). The general deployed URL is [wysiwys-colosseum.vercel.app](https://wysiwys-colosseum.vercel.app/).

## Ready to show

The dashboard loads the fresh treasury and mUSD balance. Transactions #2 and #3 are executed. Open [proposal #3](https://wysiwys-colosseum.vercel.app/transactions/3?group=CPKo7rv7raj27CU3wXjhKbpxxt3EQoebbQXy88uUGnbb) to show the stored 250 mUSD payment, decoded destination, Guard decision, 3 of 3 approvals and completed execution. Viewing these public chain records does not require a wallet.

[Service status](https://wysiwys-colosseum.vercel.app/status?group=CPKo7rv7raj27CU3wXjhKbpxxt3EQoebbQXy88uUGnbb) shows the online runner, subscribed listener and Live Chainlink DON review path. Railway and Vercel use source commit `2d07a15`.

## A fresh payment during the presentation

Have all three existing demo member wallets ready in separate wallet profiles on Solana devnet. The teammate who generated the test signers must provide or operate them securely. Each payer needs devnet SOL for transaction fees; the treasury already holds mUSD. A new unrelated wallet can view the treasury but cannot supply member approvals.

Use **New payment** for 250 mUSD to the approved demo recipient in the deployment manifest. Propose once, let the finalized Railway listener request the live CRE review, and collect all three member approvals. Votes and review may arrive in either order. Execute through the Guard only when both gates pass. The proposal requests its review immediately: complete the demo within the configured review/report deadlines. An old pending request is not a reusable fresh authorization; create a new proposal.

Keep the Devnet label visible. This deployment uses ordinary DON execution. Do not describe it as live confidential TEE execution. The existing bootstrap treasury does not have a settlement binding; show settlement-order protection only with a separately initialized opt-in treasury and its independent authority.

## Verification

Public evidence: `evidence/deploy/2026-10-13-hosted-demo-check.json`, `2026-10-13-hosted-chain-check.json` and `2026-10-13-hosted-preparation-check.json`. Chrome loaded the live treasury, transactions, completed review and status page without page errors or HTTP 5xx responses. Wallet-authenticated treasury preparation succeeded with the default and explicitly selected current policy, without submitting a new transaction. Anonymous preparation and policy reads returned 401.

Proposal #3 was independently verified at finalized commitment: Guard Review Executed, Squads Executed, all three votes, matching stored-message/policy hashes and a further 250 mUSD in the recipient account. Railway logged one automatic trigger for that review. Its browser-origin submission was not independently established.

Restart persistence, the remaining live adversarial scenarios and a hosted settlement-order race have not been verified in this session. No service restart, CRE lifecycle change or Solana deployment was performed.
