"use client";
import { walletAddressAtom } from "@/atoms";
import { useWallet } from "@solana/wallet-adapter-react";
import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { useNetworkContext } from "./NetworkProvider";
import { useEthBalance } from "./useEthBalance";

// BaseWalletMultiButton accepts { labels } directly — no type cast needed.
// The buttonState logic lives inside BaseWalletMultiButton via useWalletMultiButton,
// so custom labels work correctly at runtime.
// AC-001: 'no-wallet' → "Connect to Phantom" when no wallet extension is installed.
// 'has-wallet' kept at default "Connect" so AC-007 (modal shows "Install Phantom") works.
const PHANTOM_LABELS = {
  "change-wallet": "Change wallet",
  connecting: "Connecting ...",
  "copy-address": "Copy address",
  copied: "Copied!",
  disconnect: "Disconnect",
  "has-wallet": "Connect",
  "no-wallet": "Connect to Phantom", // AC-001
};

export default function SolanaConnectButton() {
  const [address] = useAtom(walletAddressAtom);
  const { publicKey, connected } = useWallet();
  const { isSepolia } = useNetworkContext();

  const account_address = useMemo(() => {
    if (!address) return null;
    // Sepolia: 只要有 atom 地址就显示（ETH 地址）
    // Solana: 还需要 connected 为 true
    if (!isSepolia && !connected) return null;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [address, connected, isSepolia]);

  return (
    <BaseWalletMultiButton
      className="wallet-button"
      labels={PHANTOM_LABELS}
    >
      {account_address}
    </BaseWalletMultiButton>
  );
}
