# Requirements: ETH Header Wallet Connection

## 1. Functional Requirements

### FR-001: ETH Header Component
- Complete the `eth-header.tsx` component in `apps/web/src/components/wallet/eth/`
- Header must display: App title "My ETH Dapp" (left-aligned)
- Header must display wallet connection UI (right-aligned)

### FR-002: MetaMask Wallet Connection
- Use RainbowKit's `<ConnectButton />` component for wallet connection
- Support MetaMask wallet via WalletConnect (already configured in `rainbowkit.config.ts`)
- Display wallet address when connected
- Display shortened address format (e.g., `0x1234...abcd`)
- Show network indicator when connected (mainnet / sepolia)

### FR-003: Network Indicator
- Show current network name in header when wallet is connected
- Support mainnet and sepolia (already configured in rainbowkit.config.ts)

## 2. Non-Functional Requirements

### NFR-001: Tech Stack Constraints
- Use existing RainbowKit + Wagmi configuration (do not modify `rainbowkit.config.ts`)
- Use existing `EthProvider` wrapper from `eth-provider.tsx`
- Header must be a Client Component (`"use client"`)

### NFR-002: Compatibility
- Must work with existing `apps/web/src/app/eth-page/layout.tsx`
- Header must integrate with the existing `EthProvider` context

## 3. File Impact

| File | Action | Reason |
|------|--------|--------|
| `apps/web/src/components/wallet/eth/eth-header.tsx` | Modify | Implement wallet connection UI |
| `apps/web/src/index.css` | Modify | Add `@rainbow-me/rainbowkit/styles.css` import |
| `apps/web/src/app/eth-page/layout.tsx` | No change | Already correctly wraps with EthProvider |
| `apps/web/src/app/eth-page/page.tsx` | No change | Simple placeholder page |
| `apps/web/rainbowkit.config.ts` | No change | Already configured |
| `apps/web/src/components/wallet/eth/eth-provider.tsx` | No change | Already provides context |

## 4. Acceptance Criteria

- [ ] Header displays "My ETH Dapp" title on the left
- [ ] RainbowKit ConnectButton appears on the right
- [ ] Clicking Connect shows MetaMask as an option
- [ ] Connecting with MetaMask shows truncated address (e.g., `0x1234...abcd`)
- [ ] Connected state shows network indicator (mainnet / sepolia)
- [ ] Disconnecting hides address and shows Connect button
- [ ] No console errors on page load
- [ ] TypeScript compiles without errors
- [ ] RainbowKit CSS is imported
