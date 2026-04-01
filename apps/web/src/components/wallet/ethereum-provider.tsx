"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "viem";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo";
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "demo";

// RainbowKit v2 getDefaultConfig includes built-in wallet connectors
// (MetaMask, WalletConnect, Coinbase Wallet)
export const wagmiConfig = getDefaultConfig({
  appName: "my-dapp-home-work-30",
  projectId,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
  },
});

const queryClient = new QueryClient();

export function EthereumProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
