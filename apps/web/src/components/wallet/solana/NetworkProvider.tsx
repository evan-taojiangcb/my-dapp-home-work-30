"use client";
import { createContext, useContext, useState } from "react";

export type NetworkId = "solana-devnet" | "ethereum-sepolia";

interface NetworkConfig {
  label: string;
  symbol: string;
  endpoint: string;
  description: string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  "solana-devnet": {
    label: "Solana Devnet",
    symbol: "SOL",
    endpoint: "https://api.devnet.solana.com",
    description: "Solana development network",
  },
  "ethereum-sepolia": {
    label: "Ethereum Sepolia",
    symbol: "ETH",
    endpoint: "", // No actual Solana connection — placeholder shows "— ETH"
    description: "Ethereum testnet — requires Ethereum wallet",
  },
};

interface NetworkContextValue {
  networkId: NetworkId;
  network: NetworkConfig;
  isSepolia: boolean;
  setNetworkId: (id: NetworkId) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [networkId, setNetworkId] = useState<NetworkId>("solana-devnet");
  const network = NETWORKS[networkId];

  return (
    <NetworkContext.Provider
      value={{
        networkId,
        network,
        isSepolia: networkId === "ethereum-sepolia",
        setNetworkId,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkContext(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetworkContext must be used inside NetworkProvider");
  }
  return ctx;
}
