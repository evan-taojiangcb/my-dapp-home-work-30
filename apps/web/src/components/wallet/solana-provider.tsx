"use client";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useMemo } from "react";

// Required styles for wallet adapter UI
import "@solana/wallet-adapter-react-ui/styles.css";

// Solana cluster configuration
const SOLANA_CLUSTER = "mainnet-beta";
const SOLANA_RPC_URL = `https://api.${SOLANA_CLUSTER}.solana.com`;

// Detect Phantom wallet adapter (EIP-6963 compatible + legacy)
function getPhantomAdapter(): PhantomWalletAdapter | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phantom = (window as any).phantom;
  const solana = phantom?.solana as { isPhantom?: boolean } | undefined;
  if (solana?.isPhantom) {
    return new PhantomWalletAdapter();
  }
  return null;
}

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => SOLANA_RPC_URL, []);

  const wallets = useMemo(() => {
    const phantom = getPhantomAdapter();
    return phantom ? [phantom] : [];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
