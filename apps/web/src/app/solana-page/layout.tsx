import Header from "@/components/wallet/solana/header";
import ProvidersDynamic from "@/components/wallet/solana/providers-dynamic";
import React from "react";

export default function SolanaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <ProvidersDynamic>
        <div className="grid grid-rows-[auto_1fr] h-svh">
          <Header />
          {children}
        </div>
      </ProvidersDynamic>
    </div>
  );
}
