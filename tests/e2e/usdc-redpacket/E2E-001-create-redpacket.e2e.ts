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

  // ── 回归场景 ────────────────────────────────────────────────────

  /**
   * BUG#1 回归: 合约地址未配置时点击 Approve & Create 必须显示错误提示
   * 原始问题: useCreateRedPacket 守护逻辑只调 setErrorMsg 未调 setStatus(ERROR)，导致静默失败
   */
  test("REG-001: clicking Approve & Create when contract not configured shows error message", async ({
    page,
  }) => {
    // 填写合法金额
    await page.getByLabel(/usdc amount/i).fill("5");
    // 点击提交
    await page.getByRole("button", { name: /approve & create/i }).click();
    // 必须显示错误文字（任一守护条件触发）
    await expect(
      page.locator("p.text-destructive, [data-error]").first()
    ).toBeVisible({ timeout: 3000 });
  });
});

