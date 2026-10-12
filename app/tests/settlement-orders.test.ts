import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  settlementOrderPda,
  settlementOrderId,
  type SettlementOrderRequest,
} from "@wysiwys/shared";
import {
  authorizationInstruction,
  bindingInstruction,
  parseOrderView,
  validateExactInstruction,
} from "../src/lib/squads/settlement-orders";

test("back-office instructions bind every term and reject substituted accounts, amounts or privileges", () => {
  const key = () => Keypair.generate().publicKey;
  const guard = key(),
    authority = key(),
    recipient = key();
  const request: SettlementOrderRequest = {
    authority: authority.toBase58(),
    externalId: "INVOICE-1",
    allowedVaults: [key().toBase58(), key().toBase58()],
    actionKind: 1,
    destination: recipient.toBase58(),
    recipient: recipient.toBase58(),
    mint: PublicKey.default.toBase58(),
    amount: "1000000",
    decimals: 9,
    expiresAt: "2000000000",
  };
  const expected = authorizationInstruction(guard, request);
  assert.ok(
    expected.keys[1].pubkey.equals(
      settlementOrderPda(
        guard,
        authority,
        settlementOrderId(request.externalId),
      ),
    ),
  );
  assert.equal(validateExactInstruction(expected, expected), expected);
  assert.throws(() =>
    validateExactInstruction(
      authorizationInstruction(guard, { ...request, amount: "1000001" }),
      expected,
    ),
  );
  const changed = authorizationInstruction(guard, request);
  changed.keys[1].isSigner = true;
  assert.throws(() => validateExactInstruction(changed, expected));
  const binding = bindingInstruction(guard, key(), key(), key(), authority);
  assert.equal(binding.data.length, 40);
  assert.equal(binding.keys.length, 6);
  const hex = Buffer.from(settlementOrderId(request.externalId)).toString(
    "hex",
  );
  const { externalId: _, ...terms } = request;
  const state = {
    ...terms,
    address: expected.keys[1].pubkey.toBase58(),
    orderIdHex: hex,
    consumed: false,
    settledMultisig: PublicKey.default.toBase58(),
    settledTxIndex: "0",
    settledTxHash: "00".repeat(32),
    settledAt: "0",
    secret: "must never be returned",
  };
  assert.equal(
    "secret" in parseOrderView(state, guard, request.authority, hex),
    false,
  );
  assert.throws(() =>
    parseOrderView(
      { ...state, address: key().toBase58() },
      guard,
      request.authority,
      hex,
    ),
  );
  assert.throws(() =>
    parseOrderView(
      { ...state, consumed: "true" },
      guard,
      request.authority,
      hex,
    ),
  );
});
