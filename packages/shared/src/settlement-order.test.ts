import { strict as assert } from "node:assert";
import { test } from "node:test";
import { PublicKey } from "@solana/web3.js";
import { settlementOrderId, settlementOrderPda, settlementBindingPda, validateSettlementTerms } from "./settlement-order";

const key = (n: number) => new PublicKey(new Uint8Array(32).fill(n));
const terms = () => ({ orderId: settlementOrderId("OTC-2026-001"), allowedVaults: [key(1), key(2)], actionKind: 1 as const, destination: key(3), recipient: key(3), mint: PublicKey.default, amount: 1_000_000n, decimals: 9, expiresAt: 1_800_000_000n });

test("one authority and order ID identify the same obligation across vaults", () => {
  assert.deepEqual(settlementOrderId("OTC-2026-001"), settlementOrderId("OTC-2026-001"));
  assert.notDeepEqual(settlementOrderId("OTC-2026-001"), settlementOrderId("OTC-2026-002"));
  const id = settlementOrderId("OTC-2026-001");
  assert.equal(settlementOrderPda(key(7), key(8), id).toBase58(), settlementOrderPda(key(7), key(8), id).toBase58());
  assert.notEqual(settlementOrderPda(key(7), key(8), id).toBase58(), settlementOrderPda(key(7), key(9), id).toBase58());
  assert.notEqual(settlementBindingPda(key(7), key(1)).toBase58(), settlementBindingPda(key(7), key(2)).toBase58());
});

test("terms use exact integer amounts, bounded distinct vaults and explicit token identity", () => {
  assert.doesNotThrow(() => validateSettlementTerms(terms()));
  assert.doesNotThrow(() => validateSettlementTerms({ ...terms(), actionKind: 2, mint: key(4), decimals: 6, recipient: key(5) }));
  for (const bad of [
    { amount: 0n }, { amount: 1n << 64n }, { amount: 0.1 }, { expiresAt: 0n }, { expiresAt: 1n << 63n },
    { allowedVaults: [] }, { allowedVaults: [key(1), key(1)] }, { allowedVaults: Array.from({ length: 9 }, (_, i) => key(i + 1)) },
    { actionKind: 0 }, { mint: key(4) }, { recipient: key(5) }, { decimals: 6 }, { orderId: new Uint8Array(31) },
  ]) assert.throws(() => validateSettlementTerms({ ...terms(), ...bad } as any), JSON.stringify(bad, (_, v) => typeof v === "bigint" ? v.toString() : v));
  assert.throws(() => validateSettlementTerms({ ...terms(), actionKind: 2, decimals: 6 }));
  assert.throws(() => settlementOrderId(""));
});
