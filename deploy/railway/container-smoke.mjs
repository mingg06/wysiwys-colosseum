import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";

// Disposable local fixtures only. This does not contact devnet, CRE or hosted accounts.
const exec = promisify(execFile);
const docker = process.env.DOCKER_BIN || "docker";
const image = process.argv[2] || "wysiwys-runner:devnet";
const name = `wysiwys-smoke-${randomUUID().slice(0, 8)}`;
const volume = `${name}-data`;
const cli = async (...args) => (await exec(docker, args, { timeout: 90000, maxBuffer: 1024 * 1024 })).stdout.trim();
const server = createServer((req, res) => {
  let body = "";
  req.on("data", bytes => { body += bytes; });
  req.on("end", () => {
    const rpc = JSON.parse(body);
    const result = rpc.method === "getSignaturesForAddress" ? [] : null;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result }));
  });
});
const sockets = new WebSocket.Server({ server });
sockets.on("connection", socket => socket.on("message", data => {
  const message = JSON.parse(String(data));
  if (message.method === "ping") return;
  assert.ok(["logsSubscribe", "logsUnsubscribe"].includes(message.method));
  if (message.method === "logsSubscribe") assert.equal(message.params[1].commitment, "finalized");
  socket.send(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: message.method === "logsSubscribe" ? 1 : true }));
}));
await new Promise(resolve => server.listen(0, "0.0.0.0", resolve));
const rpc = `http://host.docker.internal:${server.address().port}`;
let createdVolume = false, createdContainer = false;
async function healthy(base) {
  for (let i = 0; i < 120; i++) {
    try { const response = await fetch(`${base}/status`, { signal: AbortSignal.timeout(1000) }); if (response.ok) return await response.json(); } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Container did not become healthy");
}
try {
  await cli("volume", "create", volume); createdVolume = true;
  const hostMapping = process.platform === "linux" ? ["--add-host", "host.docker.internal:host-gateway"] : [];
  await cli("run", "-d", "--name", name, ...hostMapping, "--mount", `type=volume,src=${volume},dst=/data`, "-p", "127.0.0.1::8787", "-e", "PORT=8787", "-e", "CRE_PROJECT_DIR=", "-e", "SETTLEMENT_TOKEN=dummy-smoke-token", "-e", `HELIUS_DEVNET_RPC_URL=${rpc}`, "-e", `HELIUS_DEVNET_WS_URL=${rpc.replace("http:", "ws:")}`, image); createdContainer = true;
  const endpoint = async () => `http://127.0.0.1:${(await cli("port", name, "8787/tcp")).split(":").at(-1)}`;
  const base = await endpoint();
  const first = await healthy(base);
  assert.equal(first.listener.subscribed, true);
  const denied = await fetch(`${base}/frontend/orders/authorize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(denied.status, 401);
  console.log("Runner healthy with finalized subscription; unauthenticated order preparation blocked.");
  await cli("stop", "--time", "10", name);
  await cli("run", "--rm", "--mount", `type=volume,src=${volume},dst=/data`, "--entrypoint", "node", image, "--import", "tsx", "--input-type=module", "-e", "import {openStore} from './services/runner/src/store.ts'; const store=openStore('/data/runner.db'); store.setCursor('smoke-persisted-cursor'); store.close();");
  await cli("start", name);
  const restarted = await healthy(await endpoint());
  assert.equal(restarted.listener.cursor, "smoke-persisted-cursor");
  console.log("SQLite cursor persisted on the mounted volume across container restart.");
  console.log(`Observed idle memory: ${await cli("stats", "--no-stream", "--format", "{{.MemUsage}}", name)}. This does not measure CRE compilation.`);
} finally {
  if (createdContainer) await cli("rm", "-f", name);
  if (createdVolume) await cli("volume", "rm", volume);
  for (const client of sockets.clients) client.terminate();
  sockets.close(); await new Promise(resolve => server.close(resolve));
}
