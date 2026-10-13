#!/usr/bin/env bash
# Build and deploy/upgrade the Guard on devnet. Resume with BUFFER=<buffer address>.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi
RPC="${HELIUS_DEVNET_RPC_URL:-https://api.devnet.solana.com}"
PROGRAM_KEYPAIR="${GUARD_PROGRAM_KEYPAIR:-keys/guard-program.json}"
DEPLOYER_KEYPAIR="${SOLANA_WALLET:-keys/devnet-deployer.json}"
UPGRADE_KEYPAIR="${GUARD_UPGRADE_AUTHORITY_KEYPAIR:-$DEPLOYER_KEYPAIR}"

VERSION=$(solana --version)
if [[ ! "$VERSION" =~ ^solana-cli\ ([0-9]+)\.([0-9]+) ]] || (( BASH_REMATCH[1] < 4 || (BASH_REMATCH[1] == 4 && BASH_REMATCH[2] < 3) )); then
  echo "Use Solana CLI 4.3 or newer for this sBPFv3 Guard build." >&2
  exit 1
fi
if [ "$(solana genesis-hash --url "$RPC")" != "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" ]; then
  echo "Refusing deployment: RPC is not Solana devnet." >&2
  exit 1
fi
PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR")
EXPECTED_ID=$(node -p 'JSON.parse(require("fs").readFileSync("deployments/devnet.json", "utf8")).programId')
if [ "$PROGRAM_ID" != "$EXPECTED_ID" ]; then
  echo "Refusing deployment: program keypair does not match deployments/devnet.json." >&2
  exit 1
fi

# No local-test feature flags. Do not reuse the validator's short-policy-delay binary.
anchor build -p wysiwys_guard
DEPLOY_ARGS=(program deploy target/deploy/wysiwys_guard.so --program-id "$PROGRAM_KEYPAIR" --keypair "$DEPLOYER_KEYPAIR" --upgrade-authority "$UPGRADE_KEYPAIR" --url "$RPC" --with-compute-unit-price 100000 --max-sign-attempts 50)
if [ -n "${BUFFER:-}" ]; then DEPLOY_ARGS+=(--buffer "$BUFFER"); fi
solana "${DEPLOY_ARGS[@]}"
solana program show "$PROGRAM_ID" --url "$RPC"
