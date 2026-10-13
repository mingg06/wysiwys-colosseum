# Solami integration deferred: continue devnet

## Current decision

On 13 October 2026 the user confirmed their Solami RPC and WebSocket access is mainnet-only, then instructed us to leave mainnet untouched and continue devnet. Retain Railway for the continuous runner, finalized Helius WebSocket subscription, minute backfill and persistent SQLite. Restore the current CRE source trio: QuickNode, Helius and Alchemy, all devnet.

The earlier Solami source replacement was prepared locally and never deployed. It is reverted because it cannot supply devnet account state. No mainnet connections, deployments, keys or treasury changes are part of this plan. Existing Guard, policy, report and quorum contracts remain unchanged.

## Configuration

Use `HELIUS_DEVNET_RPC_URL` and `HELIUS_DEVNET_WS_URL` for the runner. CRE uses `CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL`, `CRE_HELIUS_SOLANA_DEVNET_RPC_URL` and `CRE_ALCHEMY_SOLANA_DEVNET_RPC_URL`. Do not populate the previously suggested Solami variables; they are unused by the devnet application.

Any future Solami integration requires confirmed devnet endpoints and a new implementation decision. A mainnet URL cannot substitute for a devnet source. The Superteam listing's mainnet requirements are separate from this devnet work.

## Next deployment prerequisites

The fresh Guard is now deployed and verified. Follow `deploy/TEAMMATE-HANDOFF.md` to initialize a fresh treasury, configure CRE and the private policy, activate hosting and record actual devnet evidence. No bypass of CRE or mock report authenticity is authorized by this provider rollback.

## Verification

Add regression checks that mainnet-only Solami settings do not override the devnet listener, devnet simulation forwards Alchemy credentials and ignores unused Solami settings, and the review workflow rejects a Solami endpoint as the configured third devnet source. Preserve all existing wrong-network and no-quorum tests.
