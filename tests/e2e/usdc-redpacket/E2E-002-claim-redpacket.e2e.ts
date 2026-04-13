import { expect, test } from "@playwright/test";

/**
 * E2E-002: Claim / Refund Red Packet (REQ-002, REQ-003)
 *
 * Scenario: User queries a red packet by ID and claims or refunds
 * Pre-condition: A red packet has been created (known packetId)
 */

test.describe("E2E-002: Claim / Refund USDC Red Packet", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/red-packet");
  });

  test("shows Claim Red Packet panel when wallet connected", async ({
    page,
  }) => {
    await expect(page.getByText("Claim Red Packet")).toBeVisible();
  });

  test("packet ID input and query button are present", async ({ page }) => {
    await expect(page.getByPlaceholder(/packet id/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /query|fetch|search/i })
    ).toBeVisible();
  });
});
