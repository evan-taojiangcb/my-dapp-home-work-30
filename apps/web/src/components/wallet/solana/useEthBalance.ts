"use client";
import { useQuery } from "@tanstack/react-query";

const SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/jYaQ0N_D69YM3lYProPxb0m0NEJX_HvX";

async function fetchSepoliaBalance(address: string): Promise<number> {
  const res = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });
  const json = (await res.json()) as { result?: string };
  const balanceWei = BigInt(json.result ?? "0x0");
  return Number(balanceWei) / 1e18;
}

async function getEthAccountAndBalance(): Promise<{
  address: string | null;
  balance: number | null;
}> {
  const win = window as Window &
    typeof globalThis & {
      phantom?: {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
      };
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    };

  // Phantom exposes window.phantom.ethereum (preferred); fallback to window.ethereum
  const provider = win.phantom?.ethereum ?? win.ethereum;
  if (!provider) return { address: null, balance: null };

  // eth_accounts does NOT prompt the user — returns currently-authorized accounts only
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  if (!accounts.length) return { address: null, balance: null };

  const address = accounts[0];
  const balance = await fetchSepoliaBalance(address);
  return { address, balance };
}

export function useEthBalance(enabled: boolean) {
  return useQuery({
    queryKey: ["eth-balance-sepolia"],
    queryFn: getEthAccountAndBalance,
    enabled,
    staleTime: 30_000,
  });
}
