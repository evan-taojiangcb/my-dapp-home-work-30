"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaBalance } from "./useSolanaBalance";
import { useNetworkContext } from "./NetworkProvider";

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
  const { publicKey, connected, disconnect } = useWallet();
  const { data: balance, isLoading, isError } = useSolanaBalance(publicKey ?? null);
  const { network, isSepolia } = useNetworkContext();

  if (!connected || !publicKey) return null;

  const address = publicKey.toBase58();

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Solana Wallet</h3>

      {/* Address (click to copy) */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Address</p>
        <button
          onClick={() => void copyAddress(address)}
          className="font-mono text-sm hover:text-primary transition-colors"
          title="Click to copy full address"
        >
          {formatAddress(address)}
        </button>
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
            "— ETH"
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
      <button
        onClick={() => void disconnect().catch(() => {})}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}
