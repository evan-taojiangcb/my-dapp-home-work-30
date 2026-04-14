import { BaseError, formatUnits } from "viem";

const USDC_DECIMALS = 6;

export function getInsufficientUsdcBalanceMessage(
  balance: bigint,
  requiredAmount: bigint,
) {
  return `Insufficient USDC balance. You have ${formatUnits(balance, USDC_DECIMALS)} USDC, but need ${formatUnits(requiredAmount, USDC_DECIMALS)} USDC.`;
}

export function getCreateRedPacketErrorMessage(
  error: unknown,
  context?: {
    balance?: bigint;
    requiredAmount?: bigint;
  },
) {
  const message = extractErrorMessage(error);

  if (message.includes("ERC20: transfer amount exceeds balance")) {
    if (
      context?.balance !== undefined &&
      context.requiredAmount !== undefined
    ) {
      return getInsufficientUsdcBalanceMessage(
        context.balance,
        context.requiredAmount,
      );
    }

    return "Insufficient USDC balance for this red packet amount.";
  }

  if (message.includes("USDCRedPacket: amount too small")) {
    return "Amount is too small for the selected share count.";
  }

  return message;
}

function extractErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    return error.shortMessage || error.details || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
