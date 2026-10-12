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

export interface SettlementOrderRequest {
  authority: string;
  externalId: string;
  allowedVaults: string[];
  actionKind: 1 | 2;
  destination: string;
  recipient: string;
  mint: string;
  amount: string;
  decimals: number;
  expiresAt: string;
}

export interface SettlementOrderView extends Omit<SettlementOrderRequest, "externalId"> {
  address: string;
  orderIdHex: string;
  consumed: boolean;
  settledMultisig: string;
  settledTxIndex: string;
  settledTxHash: string;
  settledAt: string;
}

export function parseSettlementOrderRequest(input: unknown): { authority: PublicKey; terms: SettlementTerms } {
  const o = input as SettlementOrderRequest;
  const fields = ["authority", "externalId", "allowedVaults", "actionKind", "destination", "recipient", "mint", "amount", "decimals", "expiresAt"];
  if (!o || typeof o !== "object" || Object.keys(o).length !== fields.length || Object.keys(o).some(k => !fields.includes(k))) throw new Error("invalid settlement fields");
  if (typeof o.externalId !== "string" || o.externalId.length > 128 || !o.externalId.length) throw new Error("order ID must be 1 to 128 characters");
  if (typeof o.amount !== "string" || !/^[1-9]\d{0,19}$/.test(o.amount) || typeof o.expiresAt !== "string" || !/^[1-9]\d{0,18}$/.test(o.expiresAt) || !Array.isArray(o.allowedVaults)) throw new Error("expected canonical integer strings and source vaults");
  const key = (s: string) => {
    if (typeof s !== "string") throw new Error("expected public key string");
    const k = new PublicKey(s);
    if (k.toBase58() !== s) throw new Error("noncanonical public key");
    return k;
  };
  const authority = key(o.authority);
  if (authority.equals(PublicKey.default) || !PublicKey.isOnCurve(authority.toBytes())) throw new Error("authority must be a signing wallet");
  const terms: SettlementTerms = { orderId: settlementOrderId(o.externalId), allowedVaults: o.allowedVaults.map(key), actionKind: o.actionKind, destination: key(o.destination), recipient: key(o.recipient), mint: key(o.mint), amount: BigInt(o.amount), decimals: o.decimals, expiresAt: BigInt(o.expiresAt) };
  validateSettlementTerms(terms);
  return { authority, terms };
}

const discriminator = (name: string) => sha256(new TextEncoder().encode(`global:${name}`)).subarray(0, 8);
export function encodeSettlementBinding(authority: PublicKey): Uint8Array {
  const data = new Uint8Array(40);
  data.set(discriminator("initialize_settlement_binding")); data.set(authority.toBytes(), 8);
  return data;
}

export function encodeAuthorizeSettlementOrder(t: SettlementTerms): Uint8Array {
  validateSettlementTerms(t);
  const data = new Uint8Array(8 + 32 + 4 + t.allowedVaults.length * 32 + 1 + 96 + 8 + 1 + 8);
  const view = new DataView(data.buffer);
  data.set(discriminator("authorize_settlement_order")); data.set(t.orderId, 8);
  view.setUint32(40, t.allowedVaults.length, true);
  let offset = 44;
  for (const key of t.allowedVaults) { data.set(key.toBytes(), offset); offset += 32; }
  data[offset++] = t.actionKind;
  for (const key of [t.destination, t.recipient, t.mint]) { data.set(key.toBytes(), offset); offset += 32; }
  view.setBigUint64(offset, t.amount, true); offset += 8;
  data[offset++] = t.decimals;
  view.setBigInt64(offset, t.expiresAt, true);
  return data;
}

/** External IDs are case-sensitive and never trimmed or normalized. */
export function settlementOrderId(externalId: string): Uint8Array {
  if (typeof externalId !== "string" || externalId.length === 0) throw new Error("order ID must be nonempty");
  const encoded = new TextEncoder().encode(externalId);
  if (new TextDecoder("utf-8", { ignoreBOM: true }).decode(encoded) !== externalId) throw new Error("order ID must be valid Unicode");
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
