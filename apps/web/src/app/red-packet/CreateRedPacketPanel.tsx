"use client";

import { useState, type FC } from "react";
import { toast } from "sonner";
import { useCreateRedPacket } from "./useCreateRedPacket";
import { RedPacketStatus } from "./constant";

const CreateRedPacketPanel: FC = () => {
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("3");
  const [isRandom, setIsRandom] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    status,
    errorMsg,
    createdPacketId,
    isLoading,
    loadingLabel,
    isWrongChain,
    createRedPacket,
    reset,
  } = useCreateRedPacket();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid USDC amount");
      return;
    }
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      toast.error("Share count must be between 1 and 100");
      return;
    }
    await createRedPacket(amount, countNum, isRandom);
  }

  async function handleCopy() {
    if (!createdPacketId) return;
    await navigator.clipboard.writeText(createdPacketId.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Show error as toast when status transitions to ERROR
  if (status === RedPacketStatus.ERROR && errorMsg) {
    // fire-once guard via a ref is overkill here; just show in UI
  }

  if (status === RedPacketStatus.SUCCESS && createdPacketId !== undefined) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-xl font-semibold">🎉 Red Packet Created!</h2>
        <p className="text-sm text-muted-foreground">
          Share this ID with recipients so they can claim their USDC.
        </p>
        <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
          <span className="text-3xl font-bold font-mono flex-1">
            #{createdPacketId.toString()}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          Create Another
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-xl font-semibold">🧧 Send a Red Packet</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="rp-amount">
            USDC Amount
          </label>
          <input
            id="rp-amount"
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {/* Count */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="rp-count">
            Number of Shares (1–100)
          </label>
          <input
            id="rp-count"
            type="number"
            min="1"
            max="100"
            step="1"
            placeholder="e.g. 5"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {/* Distribution */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Distribution</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="distribution"
                checked={!isRandom}
                onChange={() => setIsRandom(false)}
                disabled={isLoading}
              />
              <span className="text-sm">Equal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="distribution"
                checked={isRandom}
                onChange={() => setIsRandom(true)}
                disabled={isLoading}
              />
              <span className="text-sm">Random 🎲</span>
            </label>
          </div>
        </div>

        {/* Chain warning */}
        {isWrongChain && (
          <p className="text-sm text-destructive">
            ⚠️ Please switch to the Sepolia network
          </p>
        )}

        {/* Errors */}
        {status === RedPacketStatus.ERROR && errorMsg && (
          <p className="text-sm text-destructive break-all">{errorMsg}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isWrongChain}
          className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? loadingLabel ?? "Processing…" : "Approve & Create"}
        </button>
      </form>
    </div>
  );
};

export default CreateRedPacketPanel;
