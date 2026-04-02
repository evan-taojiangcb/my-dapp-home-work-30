"use client";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/trpc";
import { NetworkProvider } from "./solana/NetworkProvider";

// SolanaProvider loads client-side only — PhantomWalletAdapter accesses window at init.
const SolanaProvider = dynamic(
  () => import("./solana/SolanaProvider"),
  { ssr: false }
);

export default function ProvidersDynamic({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <SolanaProvider>{children}</SolanaProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
