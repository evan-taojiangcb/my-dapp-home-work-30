"use client";
import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useNetworkContext } from "./NetworkProvider";
import { useSolanaBalance } from "./useSolanaBalance";
import { useEthBalance } from "./useEthBalance";
import { useSolanaTransfer } from "./useSolanaTransfer";
import { useEthTransfer } from "./useEthTransfer";

type TxStatus = "idle" | "sending" | "confirming" | "success" | "error";

function formatTxId(txId: string) {
  return `${txId.slice(0, 6)}...${txId.slice(-6)}`;
}

function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isValidSolanaAddress(addr: string): boolean {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

export default function TransferPanel() {
  const { isSepolia, network } = useNetworkContext();
  const { publicKey, connected } = useWallet();
  const { data: solBalance } = useSolanaBalance(publicKey ?? null);
  const { data: ethData } = useEthBalance(isSepolia);
  const { transfer: solTransfer } = useSolanaTransfer();
  const { transfer: ethTransfer } = useEthTransfer();

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const symbol = network.symbol;
  const currentBalance = isSepolia ? (ethData?.balance ?? 0) : (solBalance ?? 0);
  const isProcessing = status === "sending" || status === "confirming";
  const isConnected = connected && !!publicKey;
  // For Ethereum, also check that an eth account is connected
  const ethAddress = ethData?.address ?? null;

  // Reset error when user edits fields
  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setToAddress(e.target.value);
      if (status === "error") setStatus("idle");
      setErrMsg(null);
    },
    [status]
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
      if (status === "error") setStatus("idle");
      setErrMsg(null);
    },
    [status]
  );

  function handleMax() {
    const max = Math.max(0, currentBalance - 0.001);
    setAmount(max.toFixed(6));
    if (status === "error") setStatus("idle");
    setErrMsg(null);
  }

  function validate(): string | null {
    if (!toAddress.trim()) return "Recipient address is required";

    const selfAddress = isSepolia ? ethAddress : publicKey?.toBase58();

    if (isSepolia) {
      if (!isValidEthAddress(toAddress))
        return "Invalid Ethereum address (must be 0x + 40 hex chars)";
      if (selfAddress && toAddress.toLowerCase() === selfAddress.toLowerCase())
        return "Cannot send to your own address";
    } else {
      if (!isValidSolanaAddress(toAddress)) return "Invalid Solana address";
      if (selfAddress && toAddress === selfAddress)
        return "Cannot send to your own address";
    }

    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) return "Enter a valid amount greater than 0";

    const maxSend = Math.max(0, currentBalance - 0.001);
    if (n > maxSend)
      return `Insufficient balance. Max transferable: ${maxSend.toFixed(6)} ${symbol}`;

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isProcessing) return;

    const err = validate();
    if (err) {
      setErrMsg(err);
      setStatus("error");
      return;
    }

    setErrMsg(null);
    setTxId(null);

    function onStatus(s: "sending" | "confirming") {
      setStatus(s);
    }

    try {
      const amountNum = parseFloat(amount);
      const tx = isSepolia
        ? await ethTransfer(toAddress.trim(), amountNum, onStatus)
        : await solTransfer(toAddress.trim(), amountNum, onStatus);

      setTxId(tx);
      setStatus("success");

      // Auto reset after 3s
      setTimeout(() => {
        setToAddress("");
        setAmount("");
        setStatus("idle");
        setTxId(null);
      }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error occurred";
      setErrMsg(msg);
      setStatus("error");
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold text-sm mb-2">Transfer</h3>
        <p className="text-sm text-muted-foreground">
          Connect your wallet first to send {symbol}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Transfer {symbol}</h3>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        {/* Recipient Address */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="transfer-to">
            Recipient Address
          </label>
          <input
            id="transfer-to"
            type="text"
            value={toAddress}
            onChange={handleAddressChange}
            readOnly={isProcessing}
            placeholder={
              isSepolia ? "0x..." : "Solana public key..."
            }
            className="w-full rounded border bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 read-only:bg-muted"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="transfer-amount">
            Amount ({symbol})
          </label>
          <div className="flex gap-2">
            <input
              id="transfer-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={handleAmountChange}
              readOnly={isProcessing}
              placeholder="0.0000"
              className="flex-1 rounded border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 read-only:bg-muted"
            />
            <button
              type="button"
              onClick={handleMax}
              disabled={isProcessing}
              className="rounded border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Available: {currentBalance.toFixed(4)} {symbol}
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              {status === "confirming" ? "Confirming..." : "Sending..."}
            </span>
          ) : (
            `Send ${symbol}`
          )}
        </button>

        {/* Validation / Status Message */}
        {(errMsg || status === "sending" || status === "confirming" || status === "success") && (
          <div
            className={`rounded px-3 py-2 text-xs ${
              status === "success"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : status === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {status === "sending" && "Sending transaction..."}
            {status === "confirming" && "Waiting for confirmation..."}
            {status === "success" && txId && (
              <>✅ Transaction confirmed!{" "}
                <span className="font-mono">{formatTxId(txId)}</span>
              </>
            )}
            {(status === "error" || (status === "idle" && errMsg)) && errMsg && (
              <>❌ {errMsg}</>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
