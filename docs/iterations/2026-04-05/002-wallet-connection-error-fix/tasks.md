# Tasks: Wallet Connection Error Fix

## T-001: Update rainbowkit.config.ts with explicit wallets

**Status**: [ ]
**File**: `apps/web/rainbowkit.config.ts`
**Action**: Add explicit `wallets` array with `injectedWallet()`

### Steps:
1. Import `injectedWallet` from `@rainbow-me/rainbowkit/wallets`
2. Add `wallets` array to `getDefaultConfig` with `injectedWallet()`
3. Ensure `chains` and `transports` are properly configured

### Acceptance Criteria:
- [ ] MetaMask button is enabled in wallet modal
- [ ] TypeScript compiles without errors
- [ ] Dev server starts without errors

## T-002: Verify wallet connection in browser

**Status**: [ ]
**Type**: Chrome DevTools MCP verification
**Tool**: Chrome DevTools MCP

### Steps:
1. Navigate to `/eth-page`
2. Click Connect button
3. Verify MetaMask button is enabled (not disabled)
4. Click MetaMask → should open MetaMask dialog
5. Approve connection → should show connected state

### Acceptance Criteria:
- [ ] MetaMask button enabled in modal
- [ ] No `runtime.lastError` in console on page load
- [ ] Connection flow completes successfully
