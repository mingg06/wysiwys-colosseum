import { PublicKey } from "@solana/web3.js";
import {
  parseSettlementOrderRequest,
  type SettlementOrderRequest,
} from "@wysiwys/shared";
import { authenticate, AuthenticationError } from "@/lib/auth/server";
import {
  assertSameOrigin,
  loadConfig,
  rateLimit,
} from "@/lib/squads/server-config";
import { callRunner } from "@/lib/squads/guard-groups";
import { fromWire, toWire, type WireInstruction } from "@/lib/squads/sdk";
import {
  authorizationInstruction,
  parseOrderView,
  validateExactInstruction,
} from "@/lib/squads/settlement-orders";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit();
    const wallet = await authenticate(request);
    const body = await request.text();
    if (body.length > 2048)
      return Response.json({ error: "Request is too large." }, { status: 413 });
    let input: SettlementOrderRequest;
    try {
      input = JSON.parse(body);
      parseSettlementOrderRequest(input);
    } catch {
      return Response.json(
        { error: "Invalid settlement order terms." },
        { status: 400 },
      );
    }
    if (input.authority !== wallet)
      throw new AuthenticationError(
        "Connect the back-office wallet to authorize this order.",
      );
    const config = await loadConfig();
    if (!config?.guardProgram)
      return Response.json({ error: "Guard is unavailable." }, { status: 503 });
    const result = (await callRunner("frontend/orders/authorize", {
      method: "POST",
      body,
    })) as { orderInstruction: WireInstruction };
    const ix = validateExactInstruction(
      fromWire(result.orderInstruction),
      authorizationInstruction(new PublicKey(config.guardProgram), input),
    );
    return Response.json(
      { orderInstruction: toWire(ix) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof AuthenticationError
            ? error.message
            : "Order preparation failed. No transaction was submitted.",
      },
      { status: error instanceof AuthenticationError ? 401 : 503 },
    );
  }
}

export async function GET(request: Request) {
  try {
    rateLimit();
    const query = new URL(request.url).searchParams;
    const authority = query.get("authority"),
      id = query.get("orderId");
    if (
      !authority ||
      new PublicKey(authority).toBase58() !== authority ||
      !id ||
      !/^[a-f0-9]{64}$/.test(id)
    )
      return Response.json(
        { error: "Invalid order identifiers." },
        { status: 400 },
      );
    const result = await callRunner(`frontend/orders/${authority}/${id}`, {
      method: "GET",
    });
    const config = await loadConfig();
    if (!config?.guardProgram) throw new Error("Guard unavailable");
    return Response.json(
      parseOrderView(result, new PublicKey(config.guardProgram), authority, id),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Order is unavailable. Check the ID and authority." },
      { status: 404 },
    );
  }
}
