# Requirements: Wallet Connection Error Fix

## Issue
When clicking "连接钱包" (Connect Wallet) and selecting MetaMask, connection fails with:
```
Unchecked runtime.lastError: A listener indicated an asynchronous response
by returning true, but the message channel closed before a response was received.
```

Additionally, the MetaMask button appears `disabled` in RainbowKit's wallet selection modal.

## Analysis
1. `runtime.lastError` is a Chrome extension messaging error — occurs when MetaMask's injected script sends a message but the page handler doesn't respond in time.
2. Disabled MetaMask button suggests connection initialization fails silently.
3. Likely cause: invalid or placeholder `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env`.

## Hypothesis
The WalletConnect `projectId` (`b76a8f3a730adabfd1a63c634aa97f7c`) may be invalid or the RainbowKit config needs explicit `wallets` list with injected wallet detection.

## Acceptance Criteria
- [ ] MetaMask button is enabled (not disabled) in wallet selection modal
- [ ] Clicking MetaMask opens MetaMask connection dialog
- [ ] `runtime.lastError` does not appear in console on page load
- [ ] Wallet connection flow completes without errors
