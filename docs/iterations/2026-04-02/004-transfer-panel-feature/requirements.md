# Requirements — 转账 Panel

## 基本信息

| 字段 | 值 |
|------|-----|
| 迭代目录 | docs/iterations/2026-04-02/004-transfer-panel-feature/ |
| 变更类型 | feature |

---

## 功能描述

在页面中新增一个转账 Panel，支持 Solana Devnet (SOL) 和 Ethereum Sepolia (ETH) 双链转账。

## 需求明细

### F-001 收款方地址输入 [✅ 已确认]
- 文本输入框，接受对方的钱包地址
- Solana 模式：校验 Base58 公钥格式
- Ethereum 模式：校验 `0x` 开头的 42 位十六进制地址
- 地址格式错误时显示内联错误信息

### F-002 转账金额输入 [✅ 已确认]
- 数字输入框，限制非负数，保留 9 位小数（SOL 精度）
- 根据当前网络显示对应代币符号（SOL / ETH）
- 支持 "MAX" 按钮（自动填入最大可转金额，SOL 留 0.001 作手续费；ETH 留 0.001 作 gas）

### F-003 转账前校验 [✅ 已确认]
- 地址不能为空且格式正确
- 金额 > 0
- 金额 ≤ 可用余额（余额不足时给出明确提示）
- 不能向自身地址转账
- 校验在点击转账按钮时触发（非实时校验）

### F-004 转账流程与状态 [✅ 已确认]
- 状态机：`idle → validating → sending → confirming → success | error`
- 状态文字展示在按钮下方：
  - `sending`：Sending transaction...
  - `confirming`：Waiting for confirmation...
  - `success`：✅ Transaction confirmed! (TxID: xxxx...xxxx)
  - `error`：❌ <错误信息>
- 转账期间所有输入框只读，按钮 disabled + `cursor-not-allowed`

### F-005 成功后更新余额 [✅ 已确认]
- SOL：调用 `queryClient.invalidateQueries({ queryKey: ["solana-balance"] })`
- ETH：调用 `queryClient.invalidateQueries({ queryKey: ["eth-balance-sepolia"] })`
- 成功后 3 秒自动清空表单并重置状态至 `idle`

### F-006 失败提示 [✅ 已确认]
- 捕获 Error 对象，读取 `message` 字段
- 以红色内联错误形式展示在状态区
- 用户修改表单后状态自动重置为 `idle`

### F-007 按钮状态锁定 [✅ 已确认]
- 转账进行中（`sending` / `confirming`）时按钮 disabled
- 防止重复点击提交多笔交易

### F-008 未连接状态处理 [⚠️ 假设: 未连接钱包时 Panel 显示"请先连接钱包"提示]
- 未连接时不显示可操作的输入框，避免用户困惑

## 范围

| 操作 | 文件 |
|------|------|
| 新增 | `apps/web/src/components/wallet/solana/TransferPanel.tsx` |
| 新增 | `apps/web/src/components/wallet/solana/useSolanaTransfer.ts` |
| 新增 | `apps/web/src/components/wallet/solana/useEthTransfer.ts` |
| 修改 | `apps/web/src/app/page.tsx`（新增 TransferPanel section） |
| 修改 | `apps/web/src/components/wallet/solana/index.ts`（导出） |

**不改动**：NetworkProvider、NetworkSelector、WalletInfoPanel、SolanaProvider、providers-dynamic
