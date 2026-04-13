"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { RED_PACKET_ADDRESS, RED_PACKET_ABI, USDC_DECIMALS } from "./constant";

export interface RedPacketInfo {
  creator: `0x${string}`;
  token: `0x${string}`;
  totalAmount: bigint;
  remainingAmount: bigint;
  totalCount: number;
  claimedCount: number;
  isRandom: boolean;
  expiry: bigint;
  refunded: boolean;
  // Derived display values
  totalAmountFormatted: string;
  remainingAmountFormatted: string;
  isExpired: boolean;
  isFull: boolean;
}

export function useRedPacketInfo(packetId: bigint | undefined) {
  const enabled =
    !!packetId &&
    packetId > 0n &&
    !!RED_PACKET_ADDRESS;

  const { data, isLoading, error, refetch } = useReadContract({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: "getPacket",
    args: [packetId ?? 0n],
    query: { enabled },
  });

  let info: RedPacketInfo | undefined;

  if (data) {
    const [
      creator,
      token,
      totalAmount,
      remainingAmount,
      totalCount,
      claimedCount,
      isRandom,
      expiry,
      refunded,
    ] = data as [
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      number,
      number,
      boolean,
      bigint,
      boolean,
    ];

    const nowSec = BigInt(Math.floor(Date.now() / 1000));

    info = {
      creator,
      token,
      totalAmount,
      remainingAmount,
      totalCount,
      claimedCount,
      isRandom,
      expiry,
      refunded,
      totalAmountFormatted: formatUnits(totalAmount, USDC_DECIMALS),
      remainingAmountFormatted: formatUnits(remainingAmount, USDC_DECIMALS),
      isExpired: nowSec >= expiry,
      isFull: claimedCount >= totalCount,
    };

    // If creator is zero address the packet doesn't exist
    if (creator === "0x0000000000000000000000000000000000000000") {
      info = undefined;
    }
  }

  return { info, isLoading, error, refetch };
}
