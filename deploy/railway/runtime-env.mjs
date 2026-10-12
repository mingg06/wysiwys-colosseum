import { resolve, relative, isAbsolute } from "node:path";

export function persistentDbPath(env) {
  const volume = resolve(env.RAILWAY_VOLUME_MOUNT_PATH || "/data");
  const db = resolve(env.RUNNER_DB_PATH || `${volume}/runner.db`);
  const inside = relative(volume, db);
  if (inside.startsWith("..") || isAbsolute(inside) || inside === "") throw new Error("RUNNER_DB_PATH must be a file inside the persistent volume");
  return db;
}

export function simulationEnvFile(env) {
  const keys = ["CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL", "CRE_HELIUS_SOLANA_DEVNET_RPC_URL", "CRE_ALCHEMY_SOLANA_DEVNET_RPC_URL", "CRE_SCORECHAIN_SANCTIONS_API_KEY", "CRE_POLICY_DOCUMENT", "CRE_POLICY_STORE_TOKEN", "CRE_SOLANA_PRIVATE_KEY", "CRE_ETH_PRIVATE_KEY"];
  return keys.filter(key => env[key]).map(key => {
    let value = env[key];
    if (key === "CRE_POLICY_DOCUMENT") {
      try { value = JSON.stringify(JSON.parse(value)); }
      catch { throw new Error("Invalid policy document JSON"); }
    }
    // The CLI and Node dotenv readers agree on literal single-quoted values. Reject ambiguous values
    // rather than silently changing credentials. Error messages never include the value.
    if (/[\r\n']/.test(value)) throw new Error(`Invalid single-line secret encoding for ${key}`);
    return `${key}='${value}'`;
  }).join("\n") + "\n";
}
