"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseEventLogs } from "viem";
import {
  RED_PACKET_ADDRESS,
  RED_PACKET_ABI,
  RED_PACKET_CHAIN_ID,
  USDC_DECIMALS,
  ClaimStatus,
} from "./constant";

export function useClaimRedPacket() {
  const { address, chainId, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [claimStatus, setClaimStatus] = useState<ClaimStatus>(ClaimStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [claimedAmount, setClaimedAmount] = useState<string | undefined>(
    undefined,
  );
  const [refundedAmount, setRefundedAmount] = useState<string | undefined>(
    undefined,
  );

  const isWrongChain =
    typeof chainId === "number" && chainId !== RED_PACKET_CHAIN_ID;

  const {
    data: receipt,
    error: receiptError,
    isLoading: receiptLoading,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash && claimStatus === ClaimStatus.CONFIRMING,
    },
  });

  useEffect(() => {
    if (claimStatus !== ClaimStatus.CONFIRMING) return;
    if (receiptError) {
      setClaimStatus(ClaimStatus.ERROR);
      setErrorMsg(receiptError.message);
      return;
    }
    if (!receipt) return;
    if (receipt.status === "reverted") {
      setClaimStatus(ClaimStatus.ERROR);
      setErrorMsg("Transaction was reverted by the EVM");
      return;
    }
    if (receipt.status === "success") {
      // Try to parse RedPacketClaimed event
      const claimEvents = parseEventLogs({
        abi: RED_PACKET_ABI,
        logs: receipt.logs,
        eventName: "RedPacketClaimed",
      });
      if (claimEvents.length > 0) {
        const args = (claimEvents[0] as any)?.args as { amount: bigint };
        setClaimedAmount(formatUnits(args.amount, USDC_DECIMALS));
      }

      // Try to parse RedPacketRefunded event
      const refundEvents = parseEventLogs({
        abi: RED_PACKET_ABI,
        logs: receipt.logs,
        eventName: "RedPacketRefunded",
      });
      if (refundEvents.length > 0) {
        const args = (refundEvents[0] as any)?.args as { amount: bigint };
        setRefundedAmount(formatUnits(args.amount, USDC_DECIMALS));
      }

      setClaimStatus(ClaimStatus.SUCCESS);
    }
  }, [claimStatus, receipt, receiptError]);

  useEffect(() => {
    setClaimStatus(ClaimStatus.IDLE);
    setErrorMsg(undefined);
    setTxHash(undefined);
    setClaimedAmount(undefined);
    setRefundedAmount(undefined);
  }, [address, chainId]);

  async function claimRedPacket(packetId: bigint) {
    if (!isConnected || !address) {
      setErrorMsg("Please connect your wallet first");
      return;
    }
    if (isWrongChain) {
      setErrorMsg("Please switch to Sepolia network");
      return;
    }
    if (!RED_PACKET_ADDRESS) {
      setErrorMsg("Contract address not configured");
      return;
    }

    try {
      setClaimStatus(ClaimStatus.CLAIMING);
      setErrorMsg(undefined);
      setClaimedAmount(undefined);

      const tx = await writeContractAsync({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: "claim",
        args: [packetId],
      });
      setTxHash(tx);
      setClaimStatus(ClaimStatus.CONFIRMING);
    } catch (err) {
      setClaimStatus(ClaimStatus.ERROR);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function refundRedPacket(packetId: bigint) {
    if (!isConnected || !address) {
      setErrorMsg("Please connect your wallet first");
      return;
    }
    if (isWrongChain) {
      setErrorMsg("Please switch to Sepolia network");
      return;
    }
    if (!RED_PACKET_ADDRESS) {
      setErrorMsg("Contract address not configured");
      return;
    }

    try {
      setClaimStatus(ClaimStatus.CLAIMING);
      setErrorMsg(undefined);
      setRefundedAmount(undefined);

      const tx = await writeContractAsync({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: "refund",
        args: [packetId],
      });
      setTxHash(tx);
      setClaimStatus(ClaimStatus.CONFIRMING);
    } catch (err) {
      setClaimStatus(ClaimStatus.ERROR);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  function reset() {
    setClaimStatus(ClaimStatus.IDLE);
    setErrorMsg(undefined);
    setTxHash(undefined);
    setClaimedAmount(undefined);
    setRefundedAmount(undefined);
  }

  const isLoading =
    claimStatus === ClaimStatus.CLAIMING ||
    claimStatus === ClaimStatus.CONFIRMING;

  return {
    claimStatus,
    errorMsg,
    claimedAmount,
    refundedAmount,
    isLoading,
    isWrongChain,
    claimRedPacket,
    refundRedPacket,
    reset,
  };
}
