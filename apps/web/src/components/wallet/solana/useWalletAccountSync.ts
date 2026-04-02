"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

type EthProvider = {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type SolanaProvider = {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getWindowProviders(): { solana: SolanaProvider | null; eth: EthProvider | null } {
  if (typeof window === "undefined") return { solana: null, eth: null };
  const win = window as Window & typeof globalThis & {
    solana?: SolanaProvider;
    phantom?: { ethereum?: EthProvider };
    ethereum?: EthProvider;
  };
  return {
    solana: win.solana ?? null,
    eth: win.phantom?.ethereum ?? win.ethereum ?? null,
  };
}

/**
 * Subscribes to Phantom wallet account-change events for both Solana and Ethereum.
 * When the user switches accounts in Phantom, the relevant react-query balance caches
 * are immediately invalidated and refetched.
 *
 * Must be called inside QueryClientProvider + SolanaProvider context.
 */
export function useWalletAccountSync() {
  const queryClient = useQueryClient();

  // Solana: accountChanged
  useEffect(() => {
    const { solana } = getWindowProviders();
    if (!solana?.on) return;

    const handleAccountChanged = () => {
      // Invalidate all solana-balance queries (prefix match covers all networkId/pubkey combos)
      void queryClient.invalidateQueries({ queryKey: ["solana-balance"] });
    };

    solana.on("accountChanged", handleAccountChanged);
    return () => {
      solana.off?.("accountChanged", handleAccountChanged);
    };
  }, [queryClient]);

  // Ethereum: accountsChanged
  useEffect(() => {
    const { eth } = getWindowProviders();
    if (!eth?.on) return;

    const handleAccountsChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ["eth-balance-sepolia"] });
    };

    eth.on("accountsChanged", handleAccountsChanged);
    return () => {
      eth.off?.("accountsChanged", handleAccountsChanged);
    };
  }, [queryClient]);
}
