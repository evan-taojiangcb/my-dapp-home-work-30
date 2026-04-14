import { describe, expect, it } from "vitest";
import {
  getCreateRedPacketErrorMessage,
  getInsufficientUsdcBalanceMessage,
} from "@/app/red-packet/useCreateRedPacket.helpers";

describe("useCreateRedPacket preflight helpers", () => {
  it("formats a friendly insufficient-balance message", () => {
    expect(getInsufficientUsdcBalanceMessage(2_500_000n, 3_000_000n)).toBe(
      "Insufficient USDC balance. You have 2.5 USDC, but need 3 USDC.",
    );
  });

  it("maps the raw ERC20 balance revert to a user-friendly message", () => {
    const error = new Error(
      "execution reverted: ERC20: transfer amount exceeds balance",
    );

    expect(
      getCreateRedPacketErrorMessage(error, {
        balance: 2_500_000n,
        requiredAmount: 3_000_000n,
      }),
    ).toBe("Insufficient USDC balance. You have 2.5 USDC, but need 3 USDC.");
  });

  it("maps the contract minimum-amount revert to a shorter hint", () => {
    const error = new Error(
      "execution reverted: USDCRedPacket: amount too small",
    );

    expect(getCreateRedPacketErrorMessage(error)).toBe(
      "Amount is too small for the selected share count.",
    );
  });

  it("keeps unrelated errors unchanged", () => {
    const error = new Error("User rejected the request.");

    expect(getCreateRedPacketErrorMessage(error)).toBe(
      "User rejected the request.",
    );
  });
});
