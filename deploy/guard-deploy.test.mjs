import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";

// Execute the real shell helper against synthetic CLI tools. No keys or network are accessed.
const address = "CmG9aMQNYw51e2tLHgavLj2DzwjuRKdzvz8BoSMZBc6S";
function run(genesis = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG", program = address) {
  const root = mkdtempSync(join(tmpdir(), "wysiwys-deploy-test-"));
  mkdirSync(join(root, "scripts")); mkdirSync(join(root, "deployments")); mkdirSync(join(root, "bin"));
  writeFileSync(join(root, "scripts/deploy-guard-devnet.sh"), readFileSync(new URL("../scripts/deploy-guard-devnet.sh", import.meta.url), "utf8").replaceAll("\r\n", "\n"));
  writeFileSync(join(root, "deployments/devnet.json"), JSON.stringify({ programId: address }));
  const log = join(root, "calls.txt");
  const cli = `#!/bin/bash
case "$1" in
--version) echo 'solana-cli 4.3.0';;
genesis-hash) echo '${genesis}';;
pubkey) echo '${program}';;
*) printf '%s\n' "$*" >> '${log}';;
esac
`;
  for (const name of ["solana", "solana-keygen", "anchor"]) writeFileSync(join(root, "bin", name), cli, { mode: 0o755 });
  const result = spawnSync("bash", [join(root, "scripts/deploy-guard-devnet.sh")], { env: { ...process.env, PATH: `${join(root, "bin")}:${dirname(process.execPath)}:${process.env.PATH}`, HELIUS_DEVNET_RPC_URL: "https://rpc.invalid", SOLANA_WALLET: "keys/devnet-deployer.json", GUARD_PROGRAM_KEYPAIR: "keys/guard-program.json" }, encoding: "utf8" });
  const calls = existsSync(log) ? readFileSync(log, "utf8") : "";
  rmSync(root, { recursive: true, force: true });
  return { ...result, calls };
}
test("deployment refuses a non-devnet cluster before build or send", () => {
  const result = run("wrong-network"); assert.notEqual(result.status, 0); assert.equal(result.calls, ""); assert.match(result.stderr, /not Solana devnet/);
});
test("deployment refuses a program keypair that differs from the active manifest", () => {
  const result = run(undefined, "11111111111111111111111111111111"); assert.notEqual(result.status, 0); assert.equal(result.calls, ""); assert.match(result.stderr, /does not match deployments/);
});
test("fresh deployment uses explicit payer, program and upgrade authority without test features", () => {
  const result = run(); assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls, /build -p wysiwys_guard/);
  assert.match(result.calls, /--program-id keys\/guard-program.json/);
  assert.match(result.calls, /--keypair keys\/devnet-deployer.json/);
  assert.match(result.calls, /--upgrade-authority keys\/devnet-deployer.json/);
  assert.doesNotMatch(result.calls, /short-policy-delay/);
});
