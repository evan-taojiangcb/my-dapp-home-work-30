"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { walletAddressAtom } from "@/atoms";
import { useNetworkContext } from "./NetworkProvider";

type EthProvider = {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type SolanaProvider = {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getWindowProviders(): {
  solana: SolanaProvider | null;
  eth: EthProvider | null;
} {
  if (typeof window === "undefined") return { solana: null, eth: null };
  const win = window as Window &
    typeof globalThis & {
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

  const [address, setAddress] = useAtom(walletAddressAtom);
  const { select, wallet, publicKey, connected } = useWallet();
  const { isSepolia } = useNetworkContext();

  const isSepoliaRef = useRef(isSepolia);
  useEffect(() => {
    isSepoliaRef.current = isSepolia;
  }, [isSepolia]);

  // 连接状态变化 + 网络切换时同步地址
  useEffect(() => {
    if (isSepoliaRef.current) {
      // 切到 Sepolia：读取当前 ETH 账号
      const win = window as any;
      const provider = win.phantom?.ethereum ?? win.ethereum;
      if (!provider) {
        setAddress(null);
        return;
      }
      void (
        provider.request({ method: "eth_accounts" }) as Promise<string[]>
      ).then((accounts) => setAddress(accounts[0] ?? null));
    } else {
      // Solana 网络：用 publicKey
      setAddress(connected ? (publicKey?.toBase58() ?? null) : null);
    }
  }, [isSepoliaRef.current, connected, publicKey, setAddress]);

  // Solana: accountChanged
  useEffect(() => {
    const { solana } = getWindowProviders();
    if (!solana?.on) return;

    const handleAccountChanged = (value: any) => {
      if (isSepoliaRef.current) return; // ← 加这一行
      void queryClient.invalidateQueries({ queryKey: ["solana-balance"] });
      setAddress(value?.toBase58() ?? null);
    };

    solana.on("accountChanged", handleAccountChanged);
    return () => {
      solana.off?.("accountChanged", handleAccountChanged);
    };
  }, [queryClient, address]);

  // Ethereum: accountsChanged
  useEffect(() => {
    const { eth } = getWindowProviders();
    if (!eth?.on) return;

    const handleAccountsChanged = (accounts: any) => {
      if (!isSepoliaRef.current) return; // ← 加这一行
      void queryClient.invalidateQueries({ queryKey: ["eth-balance-sepolia"] });
      setAddress(accounts[0] ?? null);
    };

    eth.on("accountsChanged", handleAccountsChanged);
    return () => {
      eth.off?.("accountsChanged", handleAccountsChanged);
    };
  }, [queryClient]);
}
