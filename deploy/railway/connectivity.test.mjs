import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import WebSocket from "ws";

test("deployment probe checks devnet and finalized subscriptions without exposing RPC credentials", async () => {
  let genesis = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
  const server = createServer((_req, res) => res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: genesis })));
  const socketServer = new WebSocket.Server({ server });
  socketServer.on("connection", socket => socket.on("message", bytes => {
    const message = JSON.parse(String(bytes));
    assert.equal(message.method, "logsSubscribe");
    assert.equal(message.params[1].commitment, "finalized");
    socket.send(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: 1 }));
  }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/?key=PRIVATE_TEST_CREDENTIAL`;
  async function run() {
    const env = { ...process.env, HELIUS_DEVNET_RPC_URL: base, HELIUS_DEVNET_WS_URL: base.replace("http:", "ws:"), CRE_PROJECT_DIR: "dummy-test-path", CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL: base, CRE_HELIUS_SOLANA_DEVNET_RPC_URL: base, CRE_ALCHEMY_SOLANA_DEVNET_RPC_URL: base, CRE_WORKFLOW_ID: "" };
    const child = spawn(process.execPath, ["deploy/railway/check-connectivity.mjs"], { env });
    let output = "";
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { output += data; });
    const code = await new Promise(resolve => child.on("exit", resolve));
    return { output, code };
  }
  try {
    const good = await run();
    assert.equal(good.code, 0, good.output); assert.match(good.output, /logsSubscribe: reachable/);
    assert.doesNotMatch(good.output, /PRIVATE_TEST|127\.0\.0\.1/);
    genesis = "wrong-cluster";
    const bad = await run(); assert.equal(bad.code, 1); assert.match(bad.output, /wrong cluster/);
    assert.doesNotMatch(bad.output, /PRIVATE_TEST|127\.0\.0\.1/);
  } finally { socketServer.close(); await new Promise(resolve => server.close(resolve)); }
});
