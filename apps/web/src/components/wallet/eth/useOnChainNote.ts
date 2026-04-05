"use client";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toHex, hexToString, formatEther } from "viem";

export type NoteStatus =
  | "idle"
  | "sending"
  | "confirming"
  | "success"
  | "error";

export interface OnChainNoteState {
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  status: NoteStatus;
  txHash: `0x${string}` | undefined;
  onChainHex: string | undefined;
  onChainText: string | undefined;
  errorMsg: string | undefined;
  hexPreview: string;
  estimatedGas: string | undefined;
  isGasLoading: boolean;
  sendNote: () => Promise<void>;
  reset: () => void;
}

const MAX_CHARS = 500;

export function useOnChainNote(noteText: string): OnChainNoteState {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<NoteStatus>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [onChainHex, setOnChainHex] = useState<string | undefined>(undefined);
  const [onChainText, setOnChainText] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const [estimatedGas, setEstimatedGas] = useState<string | undefined>(undefined);
  const [isGasLoading, setIsGasLoading] = useState(false);

  // Real-time hex preview
  const hexPreview = useMemo(() => {
    const trimmed = noteText.slice(0, MAX_CHARS);
    return trimmed.length > 0 ? toHex(trimmed) : "";
  }, [noteText]);

  // wagmi send transaction hook
  const { sendTransactionAsync } = useSendTransaction();

  // wagmi wait for receipt hook
  const { data: receipt, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash && status === "confirming" },
  });

  // When receipt arrives, read the full tx to get on-chain data
  useEffect(() => {
    if (status !== "confirming") return;

    // Handle receipt error (timeout, RPC failure, etc.)
    if (receiptError) {
      setErrorMsg(receiptError.message ?? "Transaction confirmation failed");
      setStatus("error");
      return;
    }

    if (!receipt) return;

    // Handle reverted transaction
    if (receipt.status === "reverted") {
      setErrorMsg("Transaction was reverted on-chain");
      setStatus("error");
      return;
    }

    async function fetchOnChainData() {
      if (!publicClient || !txHash) return;
      try {
        const tx = await publicClient.getTransaction({ hash: txHash });
        const rawHex = tx.input as string;
        setOnChainHex(rawHex);
        try {
          setOnChainText(hexToString(rawHex as `0x${string}`));
        } catch {
          setOnChainText("(unable to decode)");
        }
        setStatus("success");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Failed to read on-chain data");
        setStatus("error");
      }
    }

    void fetchOnChainData();
  }, [receipt, receiptError, status, publicClient, txHash]);

  // Estimate gas when noteText or address changes
  useEffect(() => {
    if (!address || !noteText.trim() || !publicClient) {
      setEstimatedGas(undefined);
      setIsGasLoading(false);
      return;
    }

    let cancelled = false;
    setIsGasLoading(true);

    async function estimate() {
      if (!publicClient || !address) return;
      try {
        const data = toHex(noteText.slice(0, MAX_CHARS));
        const [gasUnits, gasPrice, balance] = await Promise.all([
          publicClient.estimateGas({
            account: address,
            to: address,
            value: 0n,
            data,
          }),
          publicClient.getGasPrice(),
          publicClient.getBalance({ address }),
        ]);
        if (cancelled) return;
        const gasCostWei = gasUnits * gasPrice;
        const gasCostEth = formatEther(gasCostWei);
        const insufficientGas = balance < gasCostWei;
        setEstimatedGas(
          insufficientGas
            ? `⚠ Insufficient gas (need ~${Number(gasCostEth).toFixed(8)} ETH)`
            : `~${Number(gasCostEth).toFixed(8)} ETH`,
        );
      } catch {
        if (!cancelled) setEstimatedGas("(estimation failed)");
      } finally {
        if (!cancelled) setIsGasLoading(false);
      }
    }

    void estimate();
    return () => {
      cancelled = true;
    };
  }, [noteText, address, publicClient]);

  // Reset state when account or chain changes
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId]);

  function reset() {
    setStatus("idle");
    setTxHash(undefined);
    setOnChainHex(undefined);
    setOnChainText(undefined);
    setErrorMsg(undefined);
  }

  async function sendNote() {
    if (!address) {
      setErrorMsg("No wallet connected");
      setStatus("error");
      return;
    }
    const trimmed = noteText.slice(0, MAX_CHARS);
    if (!trimmed.trim()) {
      setErrorMsg("Note text cannot be empty");
      setStatus("error");
      return;
    }
    if (estimatedGas?.startsWith("⚠")) {
      setErrorMsg("Insufficient ETH balance to cover gas fees");
      setStatus("error");
      return;
    }

    try {
      setErrorMsg(undefined);
      setOnChainHex(undefined);
      setOnChainText(undefined);
      setStatus("sending");

      const hash = await sendTransactionAsync({
        to: address,
        value: 0n,
        data: toHex(trimmed),
      });

      setTxHash(hash);
      setStatus("confirming");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setErrorMsg(msg.includes("User rejected") ? "Transaction rejected by user" : msg);
      setStatus("error");
    }
  }

  return {
    address,
    chainId,
    status,
    txHash,
    onChainHex,
    onChainText,
    errorMsg,
    hexPreview,
    estimatedGas,
    isGasLoading,
    sendNote,
    reset,
  };
}
