# Tasks — 转账 Panel

## 基本信息

| 字段 | 值 |
|------|-----|
| 迭代目录 | docs/iterations/2026-04-02/004-transfer-panel-feature/ |
| 总任务数 | 5 |
| 预估工时 | ~1.5h |

---

## [x] T-001: 新建 `useSolanaTransfer.ts`

**文件**: `apps/web/src/components/wallet/solana/useSolanaTransfer.ts`

**描述**: 封装 Solana 转账逻辑。使用 `@solana/web3.js` `SystemProgram.transfer`，通过 wallet-adapter `sendTransaction` 发送，等待 `confirmTransaction`，成功后 invalidate 余额 query。

**验收标准**:
- [x] 接受 `(toAddress: string, amount: number)` 参数
- [x] 转账金额转换为 lamports（`amount * LAMPORTS_PER_SOL`）
- [x] 使用 `connection.getLatestBlockhash()` 获取最新区块
- [x] 调用 `connection.confirmTransaction(sig, "confirmed")` 等待确认
- [x] 成功后 `queryClient.invalidateQueries({ queryKey: ["solana-balance"] })`
- [x] 失败时抛出 Error 含可读 message

---

## [x] T-002: 新建 `useEthTransfer.ts`

**文件**: `apps/web/src/components/wallet/solana/useEthTransfer.ts`

**描述**: 封装 Ethereum Sepolia 转账逻辑。通过 EIP-1193 `eth_sendTransaction`，轮询 `eth_getTransactionReceipt` 等待确认，成功后 invalidate 余额 query。

**验收标准**:
- [x] 读取 `window.phantom.ethereum` 或 `window.ethereum` provider
- [x] 使用 `eth_accounts` 获取当前 from 地址
- [x] 金额 ETH → wei → hex 转换（`BigInt`）
- [x] 轮询 receipt，超时 60s 抛出 Error
- [x] `receipt.status === "0x0"` 时抛出 Error "Transaction reverted"
- [x] 成功后 `queryClient.invalidateQueries({ queryKey: ["eth-balance-sepolia"] })`

---

## [x] T-003: 新建 `TransferPanel.tsx`

**文件**: `apps/web/src/components/wallet/solana/TransferPanel.tsx`

**描述**: 转账表单 UI 组件。状态机管理 `idle→sending→confirming→success|error`，双链（SOL/ETH）自动切换。

**验收标准**:
- [x] 未连接钱包时显示 "Connect your wallet first" 提示
- [x] 收款地址输入框（格式校验）
- [x] 金额输入框 + MAX 按钮
- [x] 点击转账触发校验（地址格式、金额 > 0、余额充足、非自身地址）
- [x] 校验失败显示红色内联错误信息
- [x] `sending` → 状态文字 "Sending transaction..."
- [x] `confirming` → 状态文字 "Waiting for confirmation..."
- [x] `success` → "✅ Transaction confirmed! TxID: xxxx...xxxx"（绿色）
- [x] `error` → "❌ <错误信息>"（红色）
- [x] 转账进行中：输入框只读、按钮 disabled + `cursor-not-allowed`
- [x] 成功后 3 秒自动清空表单

---

## [x] T-004: 更新 `page.tsx` — 添加 TransferPanel section

**文件**: `apps/web/src/app/page.tsx`

**描述**: 在 WalletInfoPanel section 下方新增 TransferPanel section。

**验收标准**:
- [x] TransferPanel 在 WalletInfoPanel 下方渲染
- [x] 包裹在 `rounded-xl border bg-card p-4 space-y-3` 样式 section 中

---

## [x] T-005: 更新 `index.ts` — 导出 TransferPanel

**文件**: `apps/web/src/components/wallet/solana/index.ts`

**验收标准**:
- [x] 导出 `TransferPanel`
- [x] 导出 `useSolanaTransfer`
- [x] 导出 `useEthTransfer`

---

## 任务执行顺序

```
T-001 → T-002 → T-003 → T-004 → T-005
```
