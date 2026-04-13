import { expect, test } from "@playwright/test";

/**
 * E2E-001: Create Red Packet (REQ-001)
 *
 * Scenario: Connected user creates a USDC red packet
 * Pre-condition: Wallet connected on Sepolia with USDC balance
 */

test.describe("E2E-001: Create USDC Red Packet", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/red-packet");
  });

  test("shows Create Red Packet panel when wallet connected", async ({
    page,
  }) => {
    // Verify page title / navigation presence
    await expect(page.getByText("Red Packet")).toBeVisible();
  });

  test("create form has amount, count, and distribution type inputs", async ({
    page,
  }) => {
    // Panel should render form fields
    await expect(page.getByPlaceholder(/amount/i)).toBeVisible();
    await expect(page.getByPlaceholder(/count/i)).toBeVisible();
    await expect(page.getByLabel(/equal/i)).toBeVisible();
    await expect(page.getByLabel(/random/i)).toBeVisible();
  });
});
