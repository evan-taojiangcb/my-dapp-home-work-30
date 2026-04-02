"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import type { ReactNode } from "react";

const SOLANA_DEVNET_ENDPOINT = "https://api.devnet.solana.com";

const wallets = [new PhantomWalletAdapter()];

export default function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={SOLANA_DEVNET_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
