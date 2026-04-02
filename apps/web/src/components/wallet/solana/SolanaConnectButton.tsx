"use client";
import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

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
  return (
    <BaseWalletMultiButton
      className="wallet-button"
      labels={PHANTOM_LABELS}
    />
  );
}
