import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
import { persistentDbPath, simulationEnvFile } from "./runtime-env.mjs";

test("SQLite is constrained to a file inside the persistent mount", () => {
  assert.equal(persistentDbPath({ RAILWAY_VOLUME_MOUNT_PATH: "/data", RUNNER_DB_PATH: "/data/history/runner.db" }), resolve("/data/history/runner.db"));
  assert.throws(() => persistentDbPath({ RUNNER_DB_PATH: "/tmp/runner.db" }));
  assert.throws(() => persistentDbPath({ RUNNER_DB_PATH: "/data/../runner.db" }));
  assert.throws(() => persistentDbPath({ RUNNER_DB_PATH: "/data" }));
});
test("runtime secrets round-trip through the dotenv grammar without injecting new variables", () => {
  const input = { CRE_POLICY_DOCUMENT: JSON.stringify({ version: 1, note: "quoted \"text\"" }, null, 2), CRE_SOLANA_PRIVATE_KEY: "dummy-test-value", CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL: "https://example.invalid/?key=dummy&x=1", UNRELATED: "not copied" };
  const parsed = parseEnv(simulationEnvFile(input));
  assert.deepEqual(JSON.parse(parsed.CRE_POLICY_DOCUMENT), JSON.parse(input.CRE_POLICY_DOCUMENT));
  assert.equal(parsed.CRE_SOLANA_PRIVATE_KEY, input.CRE_SOLANA_PRIVATE_KEY);
  assert.equal(parsed.CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL, input.CRE_QUICKNODE_SOLANA_DEVNET_RPC_URL);
  assert.equal(parsed.UNRELATED, undefined);
  assert.throws(() => simulationEnvFile({ CRE_SOLANA_PRIVATE_KEY: "dummy'\nINJECTED=true" }), e => !e.message.includes("dummy"));
  assert.throws(() => simulationEnvFile({ CRE_POLICY_DOCUMENT: 'PRIVATE_RECIPIENT_NOT_JSON' }), e => !e.message.includes('PRIVATE'));
});
