"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "viem";
import { useMemo } from "react";

// RPC configuration
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo";
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "demo";

// wagmi config - created once at module level (safe: no browser APIs until use)
const wagmiConfig = getDefaultConfig({
  appName: "my-dapp-home-work-30",
  projectId,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
  },
});

// Solana cluster
const SOLANA_RPC_URL = `https://api.mainnet-beta.solana.com`;

function getPhantomAdapter(): PhantomWalletAdapter | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phantom = (window as any).phantom;
  const solana = phantom?.solana as { isPhantom?: boolean } | undefined;
  if (solana?.isPhantom) return new PhantomWalletAdapter();
  return null;
}

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const solanaEndpoint = useMemo(() => SOLANA_RPC_URL, []);
  const phantom = useMemo(() => getPhantomAdapter(), []);
  const solanaWallets = useMemo(() => (phantom ? [phantom] : []), [phantom]);
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <ConnectionProvider endpoint={solanaEndpoint}>
            <SolanaWalletProvider wallets={solanaWallets} autoConnect>
              <WalletModalProvider>{children}</WalletModalProvider>
            </SolanaWalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
