# Tasks: ETH Header Wallet Connection

## T-001: Add RainbowKit CSS Import

**Status**: [x]
**File**: `apps/web/src/index.css`
**Action**: Add `@import "@rainbow-me/rainbowkit/styles.css";`

### Implementation Steps:
1. Add import line to `apps/web/src/index.css`

### Acceptance Criteria:
- [x] RainbowKit stylesheet is imported in index.css

---

## T-002: Implement EthHeader with RainbowKit ConnectButton

**Status**: [x]
**File**: `apps/web/src/components/wallet/eth/eth-header.tsx`
**Action**: Modify to add RainbowKit ConnectButton

### Implementation Steps:
1. Import `ConnectButton` from `@rainbow-me/rainbowkit`
2. Replace placeholder div with `<ConnectButton />`
3. Keep existing header structure (flex, border-b, px-4 py-3)

### Acceptance Criteria:
- [x] Header displays "My ETH Dapp" title on the left
- [x] RainbowKit ConnectButton appears on the right
- [x] TypeScript compiles without errors

---

## T-003: Verify Integration with EthProvider

**Status**: [x]
**File**: `apps/web/src/app/eth-page/layout.tsx`
**Action**: Verify (no code change needed)

### Verification Steps:
1. Confirm layout.tsx wraps with EthProvider
2. Confirm EthHeader is rendered inside EthProvider
3. Confirm no import changes needed

### Acceptance Criteria:
- [x] layout.tsx already correctly wraps with EthProvider
- [x] EthHeader has access to RainbowKit context

---

## T-004: Test Wallet Connection Flow

**Status**: [ ]
**Type**: Manual verification

### Verification Steps:
1. Start dev server: `pnpm dev:web`
2. Navigate to `/eth-page`
3. Click Connect button → MetaMask option should appear
4. Click MetaMask → wallet connection dialog should appear
5. Verify connected state shows truncated address
6. Verify network indicator shows current network
7. Test disconnect returns to Connect button

### Acceptance Criteria:
- [ ] Connect button shows wallet options
- [ ] MetaMask is listed as an option
- [ ] Connected state shows address (e.g., `0x1234...abcd`)
- [ ] Network indicator visible
- [ ] Disconnect returns to Connect button
