"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import type { ReactNode } from "react";
import { useNetworkContext } from "./NetworkProvider";

const wallets = [new PhantomWalletAdapter()];

// Inner component that reads endpoint from NetworkContext after Provider is mounted.
// ConnectionProvider must receive a non-empty string endpoint — guard for empty string (Sepolia placeholder).
function SolanaConnectionProvider({ children }: { children: ReactNode }) {
  const { network } = useNetworkContext();
  if (!network.endpoint) {
    // Sepolia placeholder — no valid Solana endpoint, skip ConnectionProvider.
    return <>{children}</>;
  }
  return (
    <ConnectionProvider endpoint={network.endpoint}>
      {children}
    </ConnectionProvider>
  );
}

export default function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    // WalletProvider is always present — BaseWalletMultiButton needs WalletContext.
    // ConnectionProvider is conditionally rendered (only when endpoint is non-empty).
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <SolanaConnectionProvider>
          {children}
        </SolanaConnectionProvider>
      </WalletModalProvider>
    </WalletProvider>
  );
}
