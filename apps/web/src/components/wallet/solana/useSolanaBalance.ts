"use client";
import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { PublicKey } from "@solana/web3.js";

export function useSolanaBalance(publicKey: PublicKey | null) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["solana-balance", publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0;
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    },
    enabled: !!publicKey,
    staleTime: 30_000,
    // React Query retries failed queries 3 times by default before setting isError.
    // Errors propagate to the UI as isError = true.
  });
}
