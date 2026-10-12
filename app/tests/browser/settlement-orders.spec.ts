import { test, expect } from "@playwright/test";
import { Keypair } from "@solana/web3.js";

test("back-office order state is read from chain, with exact terms and no wallet needed to inspect it", async ({
  page,
}) => {
  await page.route("**/api/squads/config", (route) =>
    route.fulfill({ json: { config: null } }),
  );
  const key = () => Keypair.generate().publicKey.toBase58();
  const authority = key(),
    address = key(),
    recipient = key(),
    vault = key();
  await page.route("**/api/settlement-orders?**", (route) =>
    route.fulfill({
      json: {
        address,
        authority,
        orderIdHex: "11".repeat(32),
        allowedVaults: [vault],
        actionKind: 1,
        destination: recipient,
        recipient,
        mint: key(),
        amount: "1000000",
        decimals: 9,
        expiresAt: "2000000000",
        consumed: true,
        settledMultisig: key(),
        settledTxIndex: "17",
        settledTxHash: "22".repeat(32),
        settledAt: "1700000000",
      },
    }),
  );
  await page.goto("/settlement-orders");
  await expect(
    page.getByRole("heading", { name: "Settlement orders", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Business obligation ID").fill("OTC-ONE");
  await page.getByLabel("Back-office authority").fill(authority);
  await expect(
    page.getByRole("button", { name: "Authorize with back-office wallet" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Read order", exact: true }).click();
  await expect(page.getByText("SETTLED", { exact: true })).toBeVisible();
  await expect(page.getByText("Proposal 17", { exact: true })).toBeVisible();
  await expect(page.getByText("1000000", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
