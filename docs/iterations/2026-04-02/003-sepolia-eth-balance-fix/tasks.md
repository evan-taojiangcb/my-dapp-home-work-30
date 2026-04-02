# Tasks — Sepolia ETH 余额显示修复

## 基本信息

| 字段 | 值 |
|------|-----|
| 迭代目录 | docs/iterations/2026-04-02/003-sepolia-eth-balance-fix/ |
| 总任务数 | 2 |
| 预估工时 | ~20min |

---

## [x] T-001: 新建 `useEthBalance.ts` hook

**文件**: `apps/web/src/components/wallet/solana/useEthBalance.ts`

**描述**: 通过 Phantom 的 EIP-1193 接口读取已连接的 Ethereum 账户，然后通过公共 Sepolia RPC 获取 ETH 余额。不触发授权弹窗，不切链。

**验收标准**:
- [x] `useEthBalance(enabled)` 在 `enabled=true` 时执行查询
- [x] 使用 `eth_accounts`（不弹窗）获取账户
- [x] 使用 `fetch` + JSON-RPC 向 `https://rpc.sepolia.org` 获取余额
- [x] 无账户时返回 `{ address: null, balance: null }`
- [x] 结果通过 `@tanstack/react-query` 缓存，`staleTime: 30_000`

---

## [x] T-002: 更新 `WalletInfoPanel.tsx` — 余额区段响应 Sepolia ETH

**文件**: `apps/web/src/components/wallet/solana/WalletInfoPanel.tsx`

**描述**: 在 `isSepolia === true` 时使用 `useEthBalance` 获取并展示真实 ETH 余额，而非硬编码 "— ETH"。

**验收标准**:
- [x] `isSepolia === true` 时显示实际 ETH 余额（`x.xxxx ETH`）
- [x] 加载中显示 `Loading...` 动画
- [x] 无 Ethereum 账户连接时显示 `"— ETH"` 占位
- [x] `isSepolia === false` 时 SOL 余额逻辑不变
- [x] TypeScript 无类型错误

---

## 任务执行顺序

```
T-001 → T-002
```
