"use client";

import { Toaster } from "@my-dapp-home-work-30/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { queryClient } from "@/utils/trpc";
import { EthereumProvider, wagmiConfig } from "@/components/wallet/ethereum-provider";
import { SolanaProvider } from "@/components/wallet/solana-provider";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <EthereumProvider>
          <SolanaProvider>
            <RainbowKitProvider theme={darkTheme()}>
              {children}
            </RainbowKitProvider>
          </SolanaProvider>
        </EthereumProvider>
      </QueryClientProvider>
      <ReactQueryDevtools />
      <Toaster richColors />
    </ThemeProvider>
  );
}
