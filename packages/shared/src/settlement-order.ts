import { sha256 } from "@noble/hashes/sha256";
import { PublicKey } from "@solana/web3.js";
import { SEEDS } from "./guard";

export const MAX_SETTLEMENT_VAULTS = 8;
export const SETTLEMENT_ORDER_ID_DOMAIN = "wysiwys:order:v1";

export interface SettlementTerms {
  orderId: Uint8Array;
  allowedVaults: PublicKey[];
  actionKind: 1 | 2;
  destination: PublicKey;
  recipient: PublicKey;
  mint: PublicKey;
  amount: bigint;
  decimals: number;
  expiresAt: bigint;
}

/** External IDs are case-sensitive and never trimmed or normalized. */
export function settlementOrderId(externalId: string): Uint8Array {
  if (typeof externalId !== "string" || externalId.length === 0) throw new Error("order ID must be nonempty");
  return sha256(new TextEncoder().encode(SETTLEMENT_ORDER_ID_DOMAIN + externalId));
}

export function validateSettlementTerms(t: SettlementTerms): void {
  if (!(t.orderId instanceof Uint8Array) || t.orderId.length !== 32) throw new Error("order ID must be 32 bytes");
  if (!Array.isArray(t.allowedVaults) || t.allowedVaults.length < 1 || t.allowedVaults.length > MAX_SETTLEMENT_VAULTS || t.allowedVaults.some(k => !(k instanceof PublicKey) || k.equals(PublicKey.default)) || new Set(t.allowedVaults.map(k => k.toBase58())).size !== t.allowedVaults.length) throw new Error("expected 1 to 8 distinct nonzero vaults");
  if (typeof t.amount !== "bigint" || t.amount <= 0n || t.amount > (1n << 64n) - 1n) throw new Error("amount must be a positive u64 integer");
  if (typeof t.expiresAt !== "bigint" || t.expiresAt <= 0n || t.expiresAt > (1n << 63n) - 1n) throw new Error("deadline must be a positive i64 Unix timestamp");
  if (![t.destination, t.recipient, t.mint].every(k => k instanceof PublicKey) || t.destination.equals(PublicKey.default) || t.recipient.equals(PublicKey.default)) throw new Error("invalid destination, recipient or mint");
  if (!Number.isInteger(t.decimals) || t.decimals < 0 || t.decimals > 9) throw new Error("decimals must be 0 to 9");
  if (t.actionKind === 1) {
    if (!t.destination.equals(t.recipient) || !t.mint.equals(PublicKey.default) || t.decimals !== 9) throw new Error("SOL requires recipient destination, zero mint and 9 decimals");
  } else if (t.actionKind === 2) {
    if (t.mint.equals(PublicKey.default)) throw new Error("SPL requires an explicit mint");
  } else throw new Error("unsupported settlement action");
}

export function settlementBindingPda(program: PublicKey, multisig: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode(SEEDS.settlementBinding), multisig.toBytes()], program)[0];
}

export function settlementOrderPda(program: PublicKey, authority: PublicKey, orderId: Uint8Array): PublicKey {
  if (orderId.length !== 32) throw new Error("order ID must be 32 bytes");
  return PublicKey.findProgramAddressSync([new TextEncoder().encode(SEEDS.settlementOrder), authority.toBytes(), orderId], program)[0];
}
