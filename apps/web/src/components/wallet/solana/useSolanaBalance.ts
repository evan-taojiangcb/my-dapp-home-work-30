"use client";
import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { PublicKey } from "@solana/web3.js";
import { useNetworkContext } from "./NetworkProvider";

export function useSolanaBalance(publicKey: PublicKey | null) {
  const { connection } = useConnection();
  const { networkId } = useNetworkContext();

  return useQuery({
    // Include networkId so switching networks triggers a re-fetch
    queryKey: ["solana-balance", networkId, publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0;
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    },
    enabled: !!publicKey,
    staleTime: 30_000,
  });
}
