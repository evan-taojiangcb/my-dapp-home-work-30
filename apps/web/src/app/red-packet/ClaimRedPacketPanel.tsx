"use client";

import { useState, useEffect, type FC } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useRedPacketInfo } from "./useRedPacketInfo";
import { useClaimRedPacket } from "./useClaimRedPacket";
import { ClaimStatus, RED_PACKET_ADDRESS, RED_PACKET_ABI } from "./constant";

const ClaimRedPacketPanel: FC = () => {
  const { address } = useAccount();
  const [inputId, setInputId] = useState("");
  const [queriedId, setQueriedId] = useState<bigint | undefined>(undefined);

  const {
    claimStatus,
    errorMsg,
    claimedAmount,
    refundedAmount,
    isLoading,
    isWrongChain,
    claimRedPacket,
    refundRedPacket,
    reset: resetClaim,
  } = useClaimRedPacket();

  const { info, isLoading: infoLoading, refetch: refetchInfo } = useRedPacketInfo(queriedId);

  // 查询当前地址是否已领取过该红包
  const { data: alreadyClaimed, refetch: refetchClaimed } = useReadContract({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: "hasClaimed",
    args: [queriedId ?? 0n, address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!queriedId && !!address && !!RED_PACKET_ADDRESS },
  });

  // 领取 / 退款成功后立即刷新红包状态
  useEffect(() => {
    if (claimStatus === ClaimStatus.SUCCESS) {
      refetchInfo();
      refetchClaimed();
    }
  }, [claimStatus, refetchInfo, refetchClaimed]);

  function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    const id = inputId.trim();
    if (!id || isNaN(Number(id)) || Number(id) <= 0) return;
    resetClaim();
    setQueriedId(BigInt(id));
  }

  const isCreator =
    !!address &&
    !!info?.creator &&
    info.creator.toLowerCase() === address.toLowerCase();

  const canClaim =
    !!queriedId &&
    !!info &&
    !info.isFull &&
    !info.isExpired &&
    !info.refunded &&
    alreadyClaimed !== true;

  const canRefund =
    !!queriedId && !!info && isCreator && info.isExpired && !info.refunded && info.remainingAmount > 0n;

  function getStatusBadge() {
    if (!info) return null;
    if (info.refunded) return <span className="text-orange-500 text-xs font-medium">Refunded</span>;
    if (info.isFull) return <span className="text-blue-500 text-xs font-medium">All Claimed</span>;
    if (info.isExpired) return <span className="text-red-500 text-xs font-medium">Expired</span>;
    return <span className="text-green-500 text-xs font-medium">Active</span>;
  }

  function formatExpiry(expiry: bigint) {
    const d = new Date(Number(expiry) * 1000);
    return d.toLocaleString();
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="text-xl font-semibold">🧧 Claim a Red Packet</h2>

      {/* Query form */}
      <form onSubmit={handleQuery} className="flex gap-2">
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Enter red packet ID"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          Query
        </button>
      </form>

      {/* Packet info */}
      {infoLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      )}

      {queriedId && !infoLoading && !info && (
        <p className="text-sm text-destructive">Red packet not found</p>
      )}

      {info && (
        <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium">Packet #{queriedId?.toString()}</span>
            {getStatusBadge()}
          </div>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            <span>Total</span>
            <span className="text-right font-mono">{info.totalAmountFormatted} USDC</span>
            <span>Claimed</span>
            <span className="text-right font-mono">
              {info.claimedCount}/{info.totalCount} shares
            </span>
            <span>Remaining</span>
            <span className="text-right font-mono">{info.remainingAmountFormatted} USDC</span>
            <span>Distribution</span>
            <span className="text-right">{info.isRandom ? "Random 🎲" : "Equal"}</span>
            {alreadyClaimed === true && (
              <>
                <span>Your Status</span>
                <span className="text-right text-blue-500 font-medium">✅ Already claimed</span>
              </>
            )}
            <span>Expiry</span>
            <span className="text-right">{formatExpiry(info.expiry)}</span>
          </div>
        </div>
      )}

      {/* Chain warning */}
      {isWrongChain && (
        <p className="text-sm text-destructive">
          ⚠️ Please switch to the Sepolia network
        </p>
      )}

      {/* Success messages */}
      {claimStatus === ClaimStatus.SUCCESS && claimedAmount && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            🎉 You claimed {claimedAmount} USDC!
          </p>
        </div>
      )}
      {claimStatus === ClaimStatus.SUCCESS && refundedAmount && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            ✅ Refunded {refundedAmount} USDC successfully
          </p>
        </div>
      )}

      {/* Errors */}
      {claimStatus === ClaimStatus.ERROR && errorMsg && (
        <p className="text-sm text-destructive break-all">{errorMsg}</p>
      )}

      {/* Actions */}
      {(canClaim || canRefund) && (
        <div className="flex gap-3">
          {canClaim && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => queriedId && claimRedPacket(queriedId)}
              className="flex-1 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading && claimStatus === ClaimStatus.CLAIMING
                ? "Waiting for signature…"
                : isLoading
                ? "Confirming…"
                : "Claim"}
            </button>
          )}
          {canRefund && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => queriedId && refundRedPacket(queriedId)}
              className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Processing…" : "Refund"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClaimRedPacketPanel;
