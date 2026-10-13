import { readFileSync } from "node:fs";

// Run inside the deployed service. Never print RPC URLs, headers or credential values.
const manifest = JSON.parse(readFileSync(new URL("../../deployments/devnet.json", import.meta.url), "utf8"));
const expectedGenesis = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
let failures = 0;
for (const name of ["HELIUS_DEVNET_RPC_URL", "CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL", "CRE_HELIUS_SOLANA_DEVNET_RPC_URL", "CRE_ALCHEMY_SOLANA_DEVNET_RPC_URL"]) {
  const url = process.env[name];
  if (!url) { console.log(`${name}: unset`); if (process.env.CRE_PROJECT_DIR || name === "HELIUS_DEVNET_RPC_URL") failures++; continue; }
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getGenesisHash", params: [] }), signal: AbortSignal.timeout(12000) });
    const data = await response.json();
    if (!response.ok || data.error || data.result !== expectedGenesis) throw new Error();
    console.log(`${name}: devnet RPC reachable`);
  } catch { console.log(`${name}: FAILED (network, credentials or wrong cluster)`); failures++; }
}
try {
  const rpc = process.env.HELIUS_DEVNET_RPC_URL;
  if (!rpc) throw new Error();
  const url = process.env.HELIUS_DEVNET_WS_URL || rpc.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      ok ? resolve() : reject(new Error());
    };
    const timer = setTimeout(() => finish(false), 12000);
    socket.addEventListener("open", () => socket.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "logsSubscribe", params: [{ mentions: [manifest.programId] }, { commitment: "finalized" }] })));
    socket.addEventListener("message", ({ data }) => { try { const response = JSON.parse(String(data)); if (response.id === 1) finish(!response.error && Number.isInteger(response.result)); } catch { finish(false); } });
    socket.addEventListener("error", () => finish(false));
  });
  console.log("Finalized logsSubscribe: reachable");
} catch { console.log("Finalized logsSubscribe: FAILED"); failures++; }
if (process.env.CRE_WORKFLOW_ID) {
  try {
    const result = await fetch(process.env.CRE_GATEWAY_URL || "https://01.gateway.zone-a.cre.chain.link", { method: "HEAD", signal: AbortSignal.timeout(12000) });
    if (result.status >= 500) throw new Error();
    console.log(`CRE gateway: HTTP ${result.status}; trigger authentication still needs a real review`);
  } catch { console.log("CRE gateway: FAILED"); failures++; }
}
console.log("Confirm Full Trial in the Railway account, then trigger one real review to verify CRE access and peak memory.");
process.exitCode = failures ? 1 : 0;
