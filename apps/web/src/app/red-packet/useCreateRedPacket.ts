"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseUnits, parseEventLogs } from "viem";
import {
  SEPOLIA_USDC_ADDRESS,
  RED_PACKET_ADDRESS,
  RED_PACKET_ABI,
  ERC20_ABI,
  RED_PACKET_CHAIN_ID,
  USDC_DECIMALS,
  RedPacketStatus,
} from "./constant";
import {
  getCreateRedPacketErrorMessage,
  getInsufficientUsdcBalanceMessage,
} from "./useCreateRedPacket.helpers";

export function useCreateRedPacket() {
  const { address, chainId, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<RedPacketStatus>(RedPacketStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const [approveTxHash, setApproveTxHash] = useState<
    `0x${string}` | undefined
  >(undefined);
  const [createTxHash, setCreateTxHash] = useState<
    `0x${string}` | undefined
  >(undefined);
  const [createdPacketId, setCreatedPacketId] = useState<bigint | undefined>(
    undefined,
  );

  const isWrongChain =
    typeof chainId === "number" && chainId !== RED_PACKET_CHAIN_ID;

  // ── Wait for approve receipt ──────────────────────────────────
  const {
    data: approveReceipt,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: {
      enabled:
        !!approveTxHash &&
        status === RedPacketStatus.APPROVE_CONFIRMING,
    },
  });

  // ── Wait for create receipt ────────────────────────────────────
  const {
    data: createReceipt,
    error: createReceiptError,
  } = useWaitForTransactionReceipt({
    hash: createTxHash,
    query: {
      enabled:
        !!createTxHash && status === RedPacketStatus.CREATE_CONFIRMING,
    },
  });

  // ── React to approve confirmation ─────────────────────────────
  useEffect(() => {
    if (status !== RedPacketStatus.APPROVE_CONFIRMING) return;
    if (approveReceiptError) {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg(approveReceiptError.message);
      return;
    }
    if (!approveReceipt) return;
    if (approveReceipt.status === "reverted") {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg("Approve transaction was reverted");
      return;
    }
    // Approval confirmed – do nothing here; create() will be called by the
    // submit handler after this state resolves (see createRedPacket below).
  }, [status, approveReceipt, approveReceiptError]);

  // ── React to create confirmation ──────────────────────────────
  useEffect(() => {
    if (status !== RedPacketStatus.CREATE_CONFIRMING) return;
    if (createReceiptError) {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg(createReceiptError.message);
      return;
    }
    if (!createReceipt) return;
    if (createReceipt.status === "reverted") {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg("Create transaction was reverted by the EVM");
      return;
    }
    if (createReceipt.status === "success") {
      const events = parseEventLogs({
        abi: RED_PACKET_ABI,
        logs: createReceipt.logs,
        eventName: "RedPacketCreated",
      });
      if (events.length > 0) {
        const args = (events[0] as any)?.args as { packetId: bigint };
        setCreatedPacketId(args.packetId);
      }
      setStatus(RedPacketStatus.SUCCESS);
    }
  }, [status, createReceipt, createReceiptError]);

  // ── Reset on account change ───────────────────────────────────
  useEffect(() => {
    setStatus(RedPacketStatus.IDLE);
    setErrorMsg(undefined);
    setApproveTxHash(undefined);
    setCreateTxHash(undefined);
    setCreatedPacketId(undefined);
  }, [address, chainId]);

  // ── Main submit handler ───────────────────────────────────────
  async function createRedPacket(
    amountUsdc: string,
    count: number,
    isRandom: boolean,
  ) {
    if (!isConnected || !address) {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg("Please connect your wallet first");
      return;
    }
    if (isWrongChain) {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg("Please switch to Sepolia network");
      return;
    }
    if (!RED_PACKET_ADDRESS) {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg("Contract address not configured");
      return;
    }
    if (!publicClient) {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg("Public client not available");
      return;
    }

    const amountWei = parseUnits(amountUsdc, USDC_DECIMALS);
    let walletBalance: bigint | undefined;

    try {
      setErrorMsg(undefined);

      walletBalance = await publicClient.readContract({
        address: SEPOLIA_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      if (walletBalance < amountWei) {
        throw new Error(
          getInsufficientUsdcBalanceMessage(walletBalance, amountWei),
        );
      }

      // Phase 1: approve
      setStatus(RedPacketStatus.APPROVING);

      const approveTx = await writeContractAsync({
        address: SEPOLIA_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [RED_PACKET_ADDRESS, amountWei],
        gas: 100_000n,
      });
      setApproveTxHash(approveTx);
      setStatus(RedPacketStatus.APPROVE_CONFIRMING);

      // Wait for approve tx to be confirmed on-chain before calling create,
      // otherwise the allowance won't exist yet and create will revert.
      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTx,
      });
      if (approveReceipt.status === "reverted") {
        throw new Error("Approve transaction was reverted");
      }

      await publicClient.simulateContract({
        account: address,
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: "create",
        args: [SEPOLIA_USDC_ADDRESS, amountWei, count, isRandom],
        gas: 300_000n,
      });

      // Phase 2: create
      setStatus(RedPacketStatus.CREATING);

      const createTx = await writeContractAsync({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: "create",
        args: [SEPOLIA_USDC_ADDRESS, amountWei, count, isRandom],
        gas: 300_000n,
      });
      setCreateTxHash(createTx);
      setStatus(RedPacketStatus.CREATE_CONFIRMING);
    } catch (err) {
      setStatus(RedPacketStatus.ERROR);
      setErrorMsg(
        getCreateRedPacketErrorMessage(err, {
          balance: walletBalance,
          requiredAmount: amountWei,
        }),
      );
    }
  }

  function reset() {
    setStatus(RedPacketStatus.IDLE);
    setErrorMsg(undefined);
    setApproveTxHash(undefined);
    setCreateTxHash(undefined);
    setCreatedPacketId(undefined);
  }

  const isLoading = [
    RedPacketStatus.APPROVING,
    RedPacketStatus.APPROVE_CONFIRMING,
    RedPacketStatus.CREATING,
    RedPacketStatus.CREATE_CONFIRMING,
  ].includes(status);

  const loadingLabel = ({
    [RedPacketStatus.APPROVING]: "Waiting for approval signature…",
    [RedPacketStatus.APPROVE_CONFIRMING]: "Confirming approval…",
    [RedPacketStatus.CREATING]: "Waiting for create signature…",
    [RedPacketStatus.CREATE_CONFIRMING]: "Confirming red packet creation…",
  } as Record<string, string>)[status];

  return {
    status,
    errorMsg,
    createdPacketId,
    isLoading,
    loadingLabel,
    isWrongChain,
    createRedPacket,
    reset,
  };
}
