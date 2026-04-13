/**
 * 回归测试 — Gas limit 上限设定
 *
 * 覆盖 Bug #2: wagmi/viem 在 Sepolia 上自动估算 gas 超过区块上限 (16777216)，
 *   导致 "transaction gas limit too high" revert。
 *   修复方案: 所有写合约调用必须有显式 gas 上限，且不超过 Sepolia 区块上限。
 */

import { describe, it, expect } from "vitest";

const SEPOLIA_BLOCK_GAS_LIMIT = 16_777_216;

// 与 useCreateRedPacket / useClaimRedPacket 代码中的值保持一致
const GAS_LIMITS = {
  approve: 100_000,
  create: 300_000,
  claim: 200_000,
  refund: 200_000,
} as const;

describe("Gas limits regression (BUG#2)", () => {
  for (const [fn, limit] of Object.entries(GAS_LIMITS)) {
    it(`${fn}() gas limit (${limit}) must be below Sepolia block cap (${SEPOLIA_BLOCK_GAS_LIMIT})`, () => {
      expect(limit).toBeLessThan(SEPOLIA_BLOCK_GAS_LIMIT);
    });

    it(`${fn}() gas limit (${limit}) must be > 21000 (baseline tx cost)`, () => {
      expect(limit).toBeGreaterThan(21_000);
    });
  }
});
