"use client";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  parseSettlementOrderRequest,
  settlementOrderId,
  type SettlementOrderView,
} from "@wysiwys/shared";
import { useSquad } from "@/lib/squads/provider";
import { useWalletConnection } from "@/lib/auth/provider";
import { Panel, PageHeader, StatusBadge } from "@/components/design";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Explorer, SquadFeedback } from "./treasury-ui";

export function SettlementOrders() {
  const { config, snapshot, authorizeOrder, busy, deploymentToken } =
    useSquad();
  const wallet = useWalletConnection();
  const [externalId, setExternalId] = useState("");
  const [authority, setAuthority] = useState("");
  const [vaults, setVaults] = useState("");
  const [recipient, setRecipient] = useState("");
  const [destination, setDestination] = useState("");
  const [spl, setSpl] = useState(true);
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState("");
  const [decimals, setDecimals] = useState("6");
  const [deadline, setDeadline] = useState("");
  const [order, setOrder] = useState<SettlementOrderView>();
  const [notice, setNotice] = useState("");
  const [reading, setReading] = useState(false);
  const orderAuthority =
    authority || config?.settlementAuthority || wallet.address || "";
  const sourceVaults = vaults || snapshot?.vault.toBase58() || "";
  async function lookup() {
    setReading(true);
    setOrder(undefined);
    setNotice("");
    try {
      if (!externalId || externalId.length > 128)
        throw new Error("Enter the exact order ID.");
      const key = new PublicKey(orderAuthority).toBase58();
      const hex = Array.from(settlementOrderId(externalId), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const response = await fetch(
        `/api/settlement-orders?authority=${key}&orderId=${hex}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order was not found.");
      setOrder(result);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not read order.",
      );
    } finally {
      setReading(false);
    }
  }
  const status = order?.consumed
    ? "SETTLED"
    : order && BigInt(order.expiresAt) <= BigInt(Math.floor(Date.now() / 1000))
      ? "EXPIRED"
      : "AVAILABLE";
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlement orders"
        description="One business obligation, one settlement across explicitly approved vaults."
      />
      <SquadFeedback />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-lg font-semibold">
            Authorize an obligation
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Connect the independent back-office wallet. Authorization creates
            immutable on-chain terms; treasury votes and a current Guard review
            are still required to pay.
          </p>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setNotice("");
              setOrder(undefined);
              try {
                const expiresAt = Math.floor(Date.parse(deadline) / 1000);
                if (
                  !Number.isSafeInteger(expiresAt) ||
                  expiresAt <= Date.now() / 1000
                )
                  throw new Error("Choose a future deadline.");
                const request = {
                  authority: orderAuthority,
                  externalId,
                  allowedVaults: sourceVaults.split(/\s+/).filter(Boolean),
                  actionKind: spl ? (2 as const) : (1 as const),
                  destination: spl ? destination : recipient,
                  recipient,
                  mint: spl
                    ? mint || deploymentToken?.mint || ""
                    : PublicKey.default.toBase58(),
                  amount,
                  decimals: spl ? Number(decimals) : 9,
                  expiresAt: String(expiresAt),
                };
                parseSettlementOrderRequest(request);
                if (await authorizeOrder(request)) {
                  setNotice("Order authorized on chain.");
                  await lookup();
                }
              } catch (error) {
                setNotice(
                  error instanceof Error ? error.message : "Invalid order.",
                );
              }
            }}
          >
            <Field label="Business obligation ID">
              <Input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                maxLength={128}
                required
                placeholder="OTC-2026-001"
              />
            </Field>
            <p className="caption">
              Case-sensitive. Reuse the same ID for the same obligation across
              every vault.
            </p>
            <Field label="Back-office authority">
              <Input
                value={orderAuthority}
                onChange={(e) => setAuthority(e.target.value)}
                required
                spellCheck={false}
              />
            </Field>
            <Field label="Approved source vaults (1 to 8)">
              <textarea
                className="w-full rounded-lg border bg-background p-3 text-sm"
                rows={3}
                value={sourceVaults}
                onChange={(e) => setVaults(e.target.value)}
                required
                placeholder="Vault addresses, separated by spaces or newlines"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={spl}
                onChange={(e) => setSpl(e.target.checked)}
              />
              Legacy SPL token payment
            </label>
            <Field label="Recipient wallet">
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                spellCheck={false}
              />
            </Field>
            {spl && (
              <>
                <Field label="Exact destination token account">
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    spellCheck={false}
                  />
                </Field>
                <Field label="Token mint">
                  <Input
                    value={mint || deploymentToken?.mint || ""}
                    onChange={(e) => setMint(e.target.value)}
                    required
                    spellCheck={false}
                  />
                </Field>
                <Field label="Token decimals">
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    value={decimals}
                    onChange={(e) => setDecimals(e.target.value)}
                    required
                  />
                </Field>
              </>
            )}
            <Field
              label={`Exact amount in integer base units${spl ? "" : " (lamports)"}`}
            >
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                required
                placeholder="1000000"
              />
            </Field>
            <p className="caption">
              For a token with 6 decimals, 1000000 base units is 1 token. No
              rounding.
            </p>
            <Field label="Deadline (your local time)">
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </Field>
            <Button
              type="submit"
              disabled={
                !!busy || !wallet.connected || wallet.address !== orderAuthority
              }
            >
              Authorize with back-office wallet
            </Button>
          </form>
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-semibold">On-chain order state</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Enter the obligation ID and authority on the left, then read its
            current record. AVAILABLE means unconsumed; the Guard checks all
            terms and approvals during execution.
          </p>
          <Button
            variant="secondary"
            onClick={() => void lookup()}
            disabled={reading || !!busy}
          >
            {reading ? "Reading chain…" : "Read order"}
          </Button>
          {notice && (
            <p role="status" className="mt-4 text-sm">
              {notice}
            </p>
          )}
          {order && (
            <div className="mt-5 space-y-4 text-sm">
              <StatusBadge>{status}</StatusBadge>
              <p>
                Order <Explorer address={order.address} />
              </p>
              <p>
                Authority <Explorer address={order.authority} />
              </p>
              <p>
                Exact amount: <strong>{order.amount}</strong> base units,{" "}
                {order.decimals} decimals
              </p>
              <p>
                Recipient <Explorer address={order.recipient} />
              </p>
              <p>
                Destination <Explorer address={order.destination} />
              </p>
              <p>
                Deadline:{" "}
                {new Date(Number(order.expiresAt) * 1000).toLocaleString()}
              </p>
              <div>
                Eligible source vaults
                {order.allowedVaults.map((v) => (
                  <p key={v}>
                    <Explorer address={v} />
                  </p>
                ))}
              </div>
              {order.consumed && (
                <>
                  <p>
                    Settled by <Explorer address={order.settledMultisig} />
                  </p>
                  <p>Proposal {order.settledTxIndex}</p>
                  <p className="break-all font-mono text-xs">
                    Stored transaction hash: {order.settledTxHash}
                  </p>
                </>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}
