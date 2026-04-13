"use client";

import EthProvider from "@/components/wallet/eth/eth-provider";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function RedPacketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="root">
      <EthProvider>
        <div className="grid grid-rows-[auto_1fr] min-h-svh">
          <header className="p-4 border-b flex justify-between items-center">
            <h1 className="text-2xl font-bold">🧧 USDC Red Packet</h1>
            <ConnectButton />
          </header>
          {children}
        </div>
      </EthProvider>
    </div>
  );
}
