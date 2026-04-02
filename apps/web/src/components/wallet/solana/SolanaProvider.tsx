"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import type { ReactNode } from "react";
import { useNetworkContext } from "./NetworkProvider";

const wallets = [new PhantomWalletAdapter()];

// Inner component that reads endpoint from NetworkContext after Provider is mounted.
// ConnectionProvider must receive a string endpoint — we guard for empty string (Sepolia placeholder).
function SolanaConnectionProvider({ children }: { children: ReactNode }) {
  const { network } = useNetworkContext();
  if (!network.endpoint) {
    // Sepolia placeholder — ConnectionProvider requires a valid endpoint.
    // Render children without connection (Sepolia has no Solana connection).
    return <>{children}</>;
  }
  return (
    <ConnectionProvider endpoint={network.endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function SolanaProvider({ children }: { children: ReactNode }) {
  return <SolanaConnectionProvider>{children}</SolanaConnectionProvider>;
}
