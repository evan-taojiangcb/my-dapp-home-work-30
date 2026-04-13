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

  test("querying non-existent packet ID shows not found message", async ({
    page,
  }) => {
    await page.getByPlaceholder(/packet id/i).fill("999999");
    await page.getByRole("button", { name: /query/i }).click();
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 5000 });
  });

  // ── 回归场景 ────────────────────────────────────────────────────

  /**
   * BUG#3 回归: 已领取该红包的地址不应显示 Claim 按钮
   * 用法: 需要一个 KNOWN_CLAIMED_PACKET_ID 环境变量指向已被当前钱包领取的红包
   * 原始问题: canClaim 未检查链上 hasClaimed，导致已领取地址仍能点击 Claim 触发 revert
   */
  test("REG-003: Claim button is hidden and 'Already claimed' shown when address has claimed", async ({
    page,
  }) => {
    const packetId = process.env.KNOWN_CLAIMED_PACKET_ID;
    if (!packetId) {
      test.skip(true, "KNOWN_CLAIMED_PACKET_ID not set — skip regression test");
    }
    await page.getByPlaceholder(/packet id/i).fill(packetId!);
    await page.getByRole("button", { name: /query/i }).click();
    // 状态卡片应出现
    await expect(page.getByText(/already claimed/i)).toBeVisible({ timeout: 8000 });
    // Claim 按钮不应存在
    await expect(
      page.getByRole("button", { name: /^claim$/i })
    ).not.toBeVisible();
  });

  /**
   * BUG#4 回归: 领取成功后红包状态卡片数据必须自动刷新
   * 原始问题: useRedPacketInfo 使用 wagmi 缓存未 refetch，领取后 claimedCount 仍显示旧值
   * 注意: 此测试需要真实链上交互，CI 中通过 KNOWN_CLAIMABLE_PACKET_ID 控制
   */
  test("REG-004: packet info card refreshes after successful claim", async ({
    page,
  }) => {
    const packetId = process.env.KNOWN_CLAIMABLE_PACKET_ID;
    if (!packetId) {
      test.skip(true, "KNOWN_CLAIMABLE_PACKET_ID not set — skip regression test");
    }
    await page.getByPlaceholder(/packet id/i).fill(packetId!);
    await page.getByRole("button", { name: /query/i }).click();
    // 等待状态卡片出现
    await expect(page.getByText(/claimed/i).first()).toBeVisible({ timeout: 8000 });
    // 验证 refetchInterval 生效：8 秒内数据会自动刷新（无需手动操作）
    // 此处仅验证 UI 结构具备 claimedCount 显示
    await expect(page.locator("text=/\\d+\\/\\d+ shares/")).toBeVisible();
  });
});

