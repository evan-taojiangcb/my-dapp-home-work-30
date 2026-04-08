"use client";

import EthProvider from "@/components/wallet/eth/eth-provider";
import { ConnectButton } from "@rainbow-me/rainbowkit";


export default function ETHLayout(props: { children: React.ReactNode }) {
  return (
    <div className="root">
    <EthProvider>
      <div className="grid grid-rows-[auto_1fr] h-svh">
        <header className="p-4 border-b flex justify-between">
          <h1 className="text-2xl font-bold">Ethereum Wallet Event Logs</h1>
          <ConnectButton />
        </header>
        {props.children}
      </div>
    </EthProvider>
    </div>
  );
}