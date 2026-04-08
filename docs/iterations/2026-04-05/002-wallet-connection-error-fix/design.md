# Design: Wallet Connection Error Fix

## 1. Problem Summary
- RainbowKit modal shows MetaMask button as `disabled`
- Clicking produces `runtime.lastError` (Chrome extension messaging timing issue)
- Connection never completes

## 2. Root Cause Hypothesis
`getDefaultConfig` without explicit wallet list relies on `getDefaultWallets` which uses `getInjectedConnector` with `isMetaMask: true` flag detection. The `projectId` in the config is required for WalletConnect v2 relay even for injected wallets.

If `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is a placeholder/invalid value, the WalletConnect initialization fails and may cascade to affect injected wallet detection.

## 3. Fix: Add Explicit Wallet Configuration
Replace `getDefaultConfig` with explicit `getDefaultConfig` + `getDefaultWallets` chain, ensuring MetaMask injected connector is configured separately from WalletConnect dependency.

```tsx
// rainbowkit.config.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";

const config = getDefaultConfig({
  appName: "MyDapp-Ethereum",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
  wallets: [
    {
      groupName: "推荐",
      wallets: [injectedWallet()],
    },
  ],
});
```

**Key change**: `wallets` array explicitly includes `injectedWallet()` which creates MetaMask connector without depending on WalletConnect `projectId` being valid.

## 4. No Architecture Change
This is a configuration fix within existing structure. No new files, no API changes, no data model changes.

## 5. Files Affected
| File | Change |
|------|--------|
| `apps/web/rainbowkit.config.ts` | Add explicit `wallets` array with `injectedWallet()` |
