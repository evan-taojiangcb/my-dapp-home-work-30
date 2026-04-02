"use client";
import SolanaConnectButton from "./wallet/solana/SolanaConnectButton";
import NetworkSelector from "./wallet/solana/NetworkSelector";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="font-semibold">My Dapp</h1>
      <div className="flex items-center gap-3">
        <SolanaConnectButton />
        <NetworkSelector />
      </div>
    </header>
  );
}
