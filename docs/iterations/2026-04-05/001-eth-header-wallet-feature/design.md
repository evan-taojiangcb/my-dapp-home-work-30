# Design: ETH Header Wallet Connection

## 1. Overview

Complete the `EthHeader` component to enable MetaMask wallet connection via RainbowKit's `<ConnectButton />`.

## 2. Technical Approach

### 2.1 Stack
- **Wallet UI**: RainbowKit `<ConnectButton />` (supports injected wallets like MetaMask, plus WalletConnect protocol)
- **Context**: Existing `EthProvider` (WagmiProvider + RainbowKitProvider + QueryClientProvider)
- **Location**: `apps/web/src/components/wallet/eth/eth-header.tsx`

### 2.2 Component Structure

```
EthHeader (Client Component)
├── <header> - flex layout, border-b, px-4 py-3
│   ├── <h1> - "My ETH Dapp" (left)
│   └── <ConnectButton /> (right) - from @rainbow-me/rainbowkit
```

### 2.3 Why `<ConnectButton />`?
RainbowKit's `ConnectButton` provides:
- Wallet selection modal (MetaMask, Coinbase Wallet, WalletConnect)
- Truncated address display when connected
- Network indicator badge
- Disconnect option in dropdown
- All out-of-the-box, no custom implementation needed

### 2.4 Code Changes

**File: `apps/web/src/components/wallet/eth/eth-header.tsx`**

```tsx
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
```

### 2.5 CSS Import (Required)

RainbowKit requires its stylesheet to be imported. Add to `apps/web/src/index.css`:

```css
@import "@rainbow-me/rainbowkit/styles.css";
```

This must be done since RainbowKit UI components (ConnectButton) will not render correctly without the CSS.

### 2.6 Sequence (No Change Required)

The existing `eth-page/layout.tsx` already correctly wraps with `EthProvider`:

```
eth-page/layout.tsx
└── EthProvider (WagmiProvider + RainbowKitProvider + QueryClientProvider)
    └── EthHeader (ConnectButton uses RainbowKit context)
```

> Note: `EthProvider` currently creates its own `QueryClient` instance. This deviates from the architecture requirement of using `apps/web/src/utils/trpc.ts` singleton (per `ARCHITECTURE.md` L61). However, fixing this is **out of scope** for this change — the requirement is to complete the header with MetaMask connection, not refactor the provider. This existing deviation is logged as a future refactor item.

## 3. Security Considerations

- No private keys handled in frontend code
- Wallet connection via RainbowKit (supports MetaMask, Coinbase Wallet, WalletConnect)
- RPC configured via `NEXT_PUBLIC_SEPOLIA_RPC_URL` and Alchemy (per `rainbowkit.config.ts`)

## 4. Design Changes Summary

| File | Action | Reason |
|------|--------|--------|
| `apps/web/src/components/wallet/eth/eth-header.tsx` | Modify | Add ConnectButton |
| `apps/web/src/index.css` | Modify | Add RainbowKit styles import |

### 4.1 沿用既有结构

- `rainbowkit.config.ts` — 不修改（已配置）
- `eth-provider.tsx` — 不修改（已存在，EthHeader 只消费其提供的 context）
- `eth-page/layout.tsx` — 不修改（已正确 wraps EthProvider）
