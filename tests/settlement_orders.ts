import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY, type TransactionInstruction } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import { ACTION_KIND, destinationHash, settlementBindingPda, settlementOrderId, settlementOrderPda } from "@wysiwys/shared";
import { testProvider } from "./helpers/provider";
import { chainNow, expectError, guardProgram, payer, requestReview, statusOf } from "./helpers/guard";
import { approvePayload, deliverReport, setupForwardedDesk, type ForwardedDesk } from "./helpers/forwarder";
import { approve, executeRemainingAccounts, payoutIxs, proposePayout, sendWithFreshBlockhash, SQUADS_PROGRAM_ID, usdc, type Proposed } from "./helpers/squads";

describe("settlement orders across guarded vaults", () => {
  testProvider();
  const program = guardProgram();
  const connection = program.provider.connection;
  const authority = Keypair.generate();
  let a: ForwardedDesk, b: ForwardedDesk;
  let sequence = 0;
  const binding = (d: ForwardedDesk) => settlementBindingPda(program.programId, d.multisigPda);
  const bn = (v: bigint) => new anchor.BN(v.toString());

  async function bind(d: ForwardedDesk, auth = authority.publicKey) {
    return program.methods.initializeSettlementBinding(auth).accountsPartial({ multisig: d.multisigPda, createKey: d.createKey.publicKey, payer: payer().publicKey }).signers([d.createKey]).rpc({ commitment: "confirmed" });
  }
  before(async () => { a = await setupForwardedDesk(); b = await setupForwardedDesk(); await bind(a); await bind(b); });

  async function order(d: ForwardedDesk, opts: { sol?: boolean; amount?: bigint; vaults?: PublicKey[]; auth?: Keypair; deadline?: bigint; recipient?: PublicKey; mint?: PublicKey; decimals?: number; destination?: PublicKey } = {}) {
    const auth = opts.auth ?? authority;
    const id = settlementOrderId(`integration-order-${++sequence}`);
    const sol = !!opts.sol;
    const dest = opts.destination ?? (sol ? a.counterparty.publicKey : d.counterpartyAta);
    const deadline = opts.deadline ?? (await chainNow(connection)) + 600n;
    const address = settlementOrderPda(program.programId, auth.publicKey, id);
    const build = () => program.methods.authorizeSettlementOrder(Array.from(id), opts.vaults ?? [d.vaultPda], sol ? 1 : 2, dest, opts.recipient ?? (sol ? dest : d.counterparty.publicKey), opts.mint ?? (sol ? PublicKey.default : d.mint), bn(opts.amount ?? usdc(1)), opts.decimals ?? (sol ? 9 : 6), bn(deadline)).accountsPartial({ authority: auth.publicKey, payer: payer().publicKey });
    await build().signers([auth]).rpc({ commitment: "confirmed" });
    return { address, build };
  }
  type Flow = { d: ForwardedDesk; p: Proposed; review: PublicKey; destination: PublicKey };
  async function flow(d: ForwardedDesk, amount = usdc(1), sol = false, votes = 3): Promise<Flow> {
    const destination = sol ? a.counterparty.publicKey : d.counterpartyAta;
    const ixs = sol ? [SystemProgram.transfer({ fromPubkey: d.vaultPda, toPubkey: destination, lamports: amount })] : payoutIxs(d, destination, amount);
    const p = await proposePayout(connection, d, ixs);
    const { review } = await requestReview(d, p);
    await deliverReport(d, review, await approvePayload(d, review, sol ? { actionKind: ACTION_KIND.SOL, destinationHash: destinationHash(ACTION_KIND.SOL, destination.toBytes(), destination.toBytes(), PublicKey.default.toBytes()) } : {}));
    if (votes) await approve(connection, d, p.transactionIndex, votes);
    return { d, p, review, destination };
  }
  async function execute(f: Flow, orderAddress: PublicKey | null, bindingAddress = binding(f.d)) {
    const ix = await program.methods.guardedExecute().accountsPartial({ config: f.d.config, review: f.review, multisig: f.d.multisigPda, proposal: f.p.proposalPda, vaultTransaction: f.p.transactionPda, destination: f.destination, executor: f.d.executorPda, squadsProgram: SQUADS_PROGRAM_ID, instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY, settlementBinding: bindingAddress, settlementOrder: orderAddress }).remainingAccounts(await executeRemainingAccounts(connection, f.d, f.p.transactionIndex)).instruction();
    return sendWithFreshBlockhash(connection, [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ix], [payer()]);
  }
  async function unconsumed(o: PublicKey, f: Flow) {
    expect((await program.account.settlementOrder.fetch(o, "confirmed")).consumed).to.equal(false);
    expect(statusOf(await program.account.review.fetch(f.review, "confirmed"))).to.equal("approved");
  }

  it("requires an order despite all votes and an approved review; fake binding fails", async () => {
    const f = await flow(a);
    await expectError(execute(f, null), "SettlementOrderRequired");
    await expectError(execute(f, null, Keypair.generate().publicKey), "ConstraintSeeds");
  });
  it("rejects a mismatched amount and leaves both records available", async () => {
    const o = await order(a); const f = await flow(a, usdc(1) + 1n);
    const before = (await getAccount(connection, a.counterpartyAta)).amount;
    await expectError(execute(f, o.address), "SettlementMismatch");
    await unconsumed(o.address, f);
    expect((await getAccount(connection, a.counterpartyAta)).amount).to.equal(before);
  });
  it("rejects another authority and a source vault outside the authorized set", async () => {
    const foreign = await order(a, { auth: Keypair.generate() }); const f = await flow(a);
    await expectError(execute(f, foreign.address), "InvalidSettlementAuthority");
    const wrongVault = await order(a, { vaults: [b.vaultPda] });
    await expectError(execute(f, wrongVault.address), "SettlementMismatch");
  });
  it("checks recipient wallet, exact destination, mint and decimals against the stored payment", async () => {
    const f = await flow(a);
    for (const terms of [{ recipient: a.lookalike.publicKey }, { destination: a.lookalikeAta }, { mint: b.mint }, { decimals: 5 }]) {
      const o = await order(a, terms);
      await expectError(execute(f, o.address), "SettlementMismatch");
      await unconsumed(o.address, f);
    }
  });
  it("a failed token transfer rolls back both review and order consumption", async () => {
    const amount = (await getAccount(connection, a.vaultAta)).amount + 1n;
    const o = await order(a, { amount }); const f = await flow(a, amount);
    await expectError(execute(f, o.address), "insufficient funds", "InsufficientFunds");
    await unconsumed(o.address, f);
  });
  it("rolls back order consumption when Squads votes are missing, then settles exactly once", async () => {
    const o = await order(a); const f = await flow(a, usdc(1), false, 0);
    await expectError(execute(f, o.address), "InvalidProposalStatus");
    await unconsumed(o.address, f);
    await approve(connection, a, f.p.transactionIndex);
    await execute(f, o.address);
    const stored = await program.account.settlementOrder.fetch(o.address, "confirmed");
    expect(stored.consumed).to.equal(true);
    expect(stored.settledMultisig.toBase58()).to.equal(a.multisigPda.toBase58());
    expect(stored.settledTxIndex.toString()).to.equal(f.p.transactionIndex.toString());
    await expectError(execute(await flow(a), o.address), "SettlementAlreadyConsumed");
    await expectError(o.build().signers([authority]).rpc(), "already in use");
  });
  it("two eligible vaults race for the same order and only one payment succeeds", async () => {
    const amount = 1_000_000n; // Enough rent for a previously absent recipient wallet.
    const o = await order(a, { sol: true, amount, vaults: [a.vaultPda, b.vaultPda] });
    const fa = await flow(a, amount, true); const fb = await flow(b, amount, true);
    const before = await connection.getBalance(a.counterparty.publicKey, "confirmed");
    const results = await Promise.allSettled([execute(fa, o.address), execute(fb, o.address)]);
    expect(results.filter(r => r.status === "fulfilled").length, results.map(r => r.status === "rejected" ? String(r.reason) : r.value).join("\n")).to.equal(1);
    expect(results.filter(r => r.status === "rejected").length).to.equal(1);
    expect(await connection.getBalance(a.counterparty.publicKey, "confirmed") - before).to.equal(Number(amount));
    const statuses = await Promise.all([fa, fb].map(async f => statusOf(await program.account.review.fetch(f.review, "confirmed"))));
    expect(statuses.sort()).to.deep.equal(["approved", "executed"]);
  });
  it("rejects expired orders without consuming either gate", async () => {
    const deadline = (await chainNow(connection)) + 5n;
    const o = await order(a, { deadline }); const f = await flow(a);
    while ((await chainNow(connection)) < deadline) await new Promise(resolve => setTimeout(resolve, 300));
    await expectError(execute(f, o.address), "SettlementExpired");
    await unconsumed(o.address, f);
  });
  it("cannot enable orders after a treasury has started proposing or name a signer as authority", async () => {
    const d = await setupForwardedDesk();
    await expectError(bind(d, d.members[0].publicKey), "InvalidSettlementAuthority");
    await proposePayout(connection, d, payoutIxs(d, d.counterpartyAta, usdc(1)));
    await expectError(bind(d), "InvalidSettlementBinding");
  });
});
