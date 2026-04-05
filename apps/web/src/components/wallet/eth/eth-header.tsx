"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function EthHeader() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="font-semibold">My ETH Dapp</h1>
      <ConnectButton />
    </header>
  );
}
