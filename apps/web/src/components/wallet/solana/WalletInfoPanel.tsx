"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useSolanaBalance } from "./useSolanaBalance";
import { useEthBalance } from "./useEthBalance";
import { useNetworkContext } from "./NetworkProvider";
import { useWalletAccountSync } from "./useWalletAccountSync";
import { useAtomValue } from "jotai";
import { walletAddressAtom } from "@/atoms";

function formatAddress(pk: string) {
  return `${pk.slice(0, 4)}...${pk.slice(-4)}`;
}

// Clipboard copy: try navigator.clipboard first, fall back to textarea + execCommand.
async function copyAddress(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(el);
  }
}

export default function WalletInfoPanel() {
  const {connected, disconnect } = useWallet();
  const atomAddress = useAtomValue(walletAddressAtom);
  const { network, isSepolia } = useNetworkContext();

  // Convert string address to PublicKey object
  // 第 39 行替换为：
const solanaPublicKey = (() => {
  if (!atomAddress || isSepolia) return null;
  try { return new PublicKey(atomAddress); } catch { return null; }
})();
  const { data: balance, isLoading, isError } = useSolanaBalance(solanaPublicKey);
  const { data: ethData, isLoading: ethLoading } = useEthBalance(isSepolia);

  // Sync balance when user switches accounts in Phantom (both Solana & Ethereum)
  useWalletAccountSync();

  // 当前网络对应的地址
  const address = isSepolia ? (ethData?.address ?? null) : (solanaPublicKey?.toBase58() ?? null);
  const isConnected = !!connected;

  if(!isConnected) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Wallet</h3>
        <p className="text-sm text-muted-foreground">Not connected</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Wallet</h3>

      {/* Address (click to copy) */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Address</p>
        {address ? (
          <button
            onClick={() => void copyAddress(address)}
            className="font-mono text-sm hover:text-primary transition-colors"
            title="Click to copy full address"
          >
            {formatAddress(address)}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>

      {/* Network */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Network</p>
        <p className="text-sm">{network.label}</p>
      </div>

      {/* Balance */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Balance</p>
        <p className="text-sm">
          {isSepolia ? (
            ethLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : ethData?.balance != null ? (
              `${ethData.balance.toFixed(4)} ETH`
            ) : (
              "— ETH"
            )
          ) : isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : isError ? (
            "— SOL"
          ) : balance != null ? (
            `${Number(balance).toFixed(4)} SOL`
          ) : (
            "— SOL"
          )}
        </p>
      </div>

      {/* Disconnect */}
      {isConnected && (
        <button
          onClick={() => void disconnect().catch(() => {})}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}
