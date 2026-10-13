import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { SEEDS } from "../packages/shared/src/index.ts";

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const evidence = read("../evidence/deploy/2026-10-13-guard-devnet.json");
const manifest = read("../deployments/devnet.json");
const idl = read("../packages/shared/idl/wysiwys_guard.json");

test("all active devnet clients target the verified Guard", () => {
  assert.equal(manifest.cluster, "devnet");
  assert.equal(manifest.programId, evidence.programId);
  assert.equal(idl.address, evidence.programId);
  for (const target of ["local", "staging", "live"]) {
    const config = read(`../workflow/confidential-preflight/review/config.${target}.json`);
    assert.equal(config.guardProgram, evidence.programId, target);
    assert.equal(config.chainSelector, "16423721717087811551");
    if (config.policyStoreUrl) assert.doesNotMatch(config.policyStoreUrl, /sslip\.io/);
  }
});

test("a pending treasury has no reused addresses; a ready treasury binds its PDAs to the new Guard", () => {
  if (manifest.deploymentStatus === "PROGRAM_DEPLOYED_TREASURY_PENDING") {
    for (const field of ["multisig", "executorPda", "configPda", "guard", "mint", "signers", "recipients"]) assert.equal(manifest[field], undefined, field);
    return;
  }
  assert.ok(manifest.guard, "bootstrap must initialize the Guard before publishing a ready manifest");
  const multisig = new PublicKey(manifest.multisig);
  const program = new PublicKey(evidence.programId);
  for (const [field, seed] of [["executorPda", SEEDS.executor], ["configPda", SEEDS.config]]) {
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from(seed), multisig.toBuffer()], program);
    assert.equal(manifest[field], expected.toBase58(), field);
  }
});

test("Anchor keeps verified Guard addresses and the local-only forwarder consistent", () => {
  const anchor = readFileSync(new URL("../Anchor.toml", import.meta.url), "utf8");
  for (const cluster of ["localnet", "devnet"]) {
    const section = anchor.split(`[programs.${cluster}]`)[1]?.split(/\n\[/)[0];
    assert.ok(section, cluster);
    assert.match(section, new RegExp(`wysiwys_guard = "${evidence.programId}"`));
  }
  const source = readFileSync(new URL("../programs/test_forwarder/src/lib.rs", import.meta.url), "utf8");
  const forwarder = source.match(/declare_id!\("([^"]+)"\)/)?.[1];
  assert.ok(forwarder);
  assert.ok(anchor.includes(`test_forwarder = "${forwarder}"`));
  assert.match(anchor, /# Local tests only\. Never deploy to devnet\./);
});
