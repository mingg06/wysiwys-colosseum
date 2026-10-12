import { Buffer } from "buffer";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  SEEDS,
  encodeAuthorizeSettlementOrder,
  encodeSettlementBinding,
  parseSettlementOrderRequest,
  settlementBindingPda,
  settlementOrderPda,
  type SettlementOrderRequest,
  type SettlementOrderView,
} from "@wysiwys/shared";

export function authorizationInstruction(
  guard: PublicKey,
  request: SettlementOrderRequest,
) {
  const { authority, terms } = parseSettlementOrderRequest(request);
  return new TransactionInstruction({
    programId: guard,
    data: Buffer.from(encodeAuthorizeSettlementOrder(terms)),
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      {
        pubkey: settlementOrderPda(guard, authority, terms.orderId),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function bindingInstruction(
  guard: PublicKey,
  multisig: PublicKey,
  createKey: PublicKey,
  payer: PublicKey,
  authority: PublicKey,
) {
  if (
    !PublicKey.isOnCurve(authority.toBytes()) ||
    authority.equals(PublicKey.default)
  )
    throw new Error("Back-office authority must be a signing wallet.");
  const config = PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.config), multisig.toBuffer()],
    guard,
  )[0];
  return new TransactionInstruction({
    programId: guard,
    data: Buffer.from(encodeSettlementBinding(authority)),
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: multisig, isSigner: false, isWritable: false },
      { pubkey: createKey, isSigner: true, isWritable: false },
      {
        pubkey: settlementBindingPda(guard, multisig),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
}

export function validateExactInstruction(
  actual: TransactionInstruction,
  expected: TransactionInstruction,
) {
  if (
    !actual.programId.equals(expected.programId) ||
    !actual.data.equals(expected.data) ||
    actual.keys.length !== expected.keys.length ||
    actual.keys.some(
      (key, i) =>
        !key.pubkey.equals(expected.keys[i].pubkey) ||
        key.isSigner !== expected.keys[i].isSigner ||
        key.isWritable !== expected.keys[i].isWritable,
    )
  )
    throw new Error(
      "Settlement instruction does not match the authorized terms.",
    );
  return actual;
}

/** Return only public fields after checking the requested order and its PDA. */
export function parseOrderView(
  input: unknown,
  guard: PublicKey,
  authority: string,
  orderIdHex: string,
): SettlementOrderView {
  const o = input as SettlementOrderView;
  if (
    !o ||
    o.authority !== authority ||
    o.orderIdHex !== orderIdHex ||
    !/^[a-f0-9]{64}$/.test(orderIdHex) ||
    typeof o.consumed !== "boolean"
  )
    throw new Error("Order binding mismatch.");
  const request: SettlementOrderRequest = {
    authority: o.authority,
    externalId: "validation",
    allowedVaults: o.allowedVaults,
    actionKind: o.actionKind,
    destination: o.destination,
    recipient: o.recipient,
    mint: o.mint,
    amount: o.amount,
    decimals: o.decimals,
    expiresAt: o.expiresAt,
  };
  const { authority: key } = parseSettlementOrderRequest(request);
  if (
    o.address !==
      settlementOrderPda(
        guard,
        key,
        Buffer.from(orderIdHex, "hex"),
      ).toBase58() ||
    new PublicKey(o.settledMultisig).toBase58() !== o.settledMultisig ||
    !/^(0|[1-9]\d{0,19})$/.test(o.settledTxIndex) ||
    !/^(0|[1-9]\d{0,18})$/.test(o.settledAt) ||
    !/^[a-f0-9]{64}$/.test(o.settledTxHash)
  )
    throw new Error("Invalid order state.");
  const { externalId: _, ...terms } = request;
  return {
    ...terms,
    address: o.address,
    orderIdHex,
    consumed: o.consumed,
    settledMultisig: o.settledMultisig,
    settledTxIndex: o.settledTxIndex,
    settledTxHash: o.settledTxHash,
    settledAt: o.settledAt,
  };
}
