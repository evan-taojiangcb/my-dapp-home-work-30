import EthHeader from "@/components/wallet/eth/eth-header";
import EthProvider from "@/components/wallet/eth/eth-provider";
import React from "react";

export default function SolanaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <EthProvider>
        <div className="grid grid-rows-[auto_1fr] h-svh">
          <EthHeader />
          {children}
        </div>
      </EthProvider>
    </div>
  );
}
