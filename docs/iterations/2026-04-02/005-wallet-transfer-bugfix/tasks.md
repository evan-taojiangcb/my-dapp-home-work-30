# Tasks: 005-wallet-transfer-bugfix

## 需求概述
修复转账面板三个 Bug：账号切换未同步、转账报 Unexpected error、转账后余额未刷新

## 任务清单

### Bug 1: 钱包切换账号未同步到页面
- [x] 创建 `useWalletAccountSync.ts` hook
  - 监听 `window.solana.on("accountChanged")` → 触发 Solana balance query 失效刷新
  - 监听 `window.phantom.ethereum.on("accountsChanged")` → 触发 ETH balance query 失效刷新
- [x] 在 `WalletInfoPanel.tsx` 中调用 `useWalletAccountSync()`
- [x] 在 `index.ts` 中导出 `useWalletAccountSync`

### Bug 2: 转账报 WalletSendTransactionError: Unexpected error
- [x] 重写 `useSolanaTransfer.ts`：
  - 从 `sendTransaction` 改为 `signTransaction` + `connection.sendRawTransaction`
  - 分阶段 try-catch：签名阶段 / RPC 发送阶段 / 确认阶段
  - 提供更清晰的错误信息

### Bug 3: 转账后余额不刷新
- [x] 修改 `useSolanaTransfer.ts`：`invalidateQueries` → `refetchQueries` 强制立即刷新
- [x] 修改 `useEthTransfer.ts`：`invalidateQueries` → `refetchQueries` 强制立即刷新

## 验收标准（Chrome DevTools MCP 浏览器验收）
- [x] Test 1: 空地址提交 → 显示 "❌ Recipient address is required"
- [x] Test 2: 超额金额 → 显示 "❌ Insufficient balance. Max transferable: X SOL"
- [x] Test 3: MAX 按钮 → 自动填充可用最大金额（余额 - 手续费）
- [x] Test 4: 切换到 Ethereum Sepolia → 面板标题为 "Transfer ETH"，余额显示 "0.0500 ETH"
- [x] Test 5: 无效 ETH 地址 → 显示 "❌ Invalid Ethereum address (must be 0x + 40 hex chars)"
- [x] Test 6: 切回 Solana Devnet → 面板恢复 "Transfer SOL"，余额显示 "5.9999 SOL"

## 测试结果
6/6 通过 ✅
