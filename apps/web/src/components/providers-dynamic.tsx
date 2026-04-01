"use client";

// Single entry point for all wallet providers, dynamically imported with ssr:false.
// This file's module code only runs on the client, preventing WalletConnect's
// indexedDB usage from causing SSR errors.
import dynamic from "next/dynamic";

const WalletProviders = dynamic(
  () => import("@/components/wallet/wallet-providers").then((m) => m.default),
  { ssr: false }
);

import Providers from "@/components/providers";

export default function WalletDynamicProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <WalletProviders>{children}</WalletProviders>
    </Providers>
  );
}
