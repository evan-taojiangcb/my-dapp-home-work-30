"use client";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/trpc";

// SSR: false — component only loads on client, solving WalletAdapter SSR issue
const SolanaProvider = dynamic(
  () => import("./solana/SolanaProvider"),
  { ssr: false }
);

export default function ProvidersDynamic({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>{children}</SolanaProvider>
    </QueryClientProvider>
  );
}
