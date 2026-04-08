# Requirements — Sepolia ETH 余额显示修复

## 基本信息

| 字段 | 值 |
|------|-----|
| 迭代目录 | docs/iterations/2026-04-02/003-sepolia-eth-balance-fix/ |
| 变更类型 | fix |
| 来源 | 用户报告 |

---

## 问题描述

用户使用 Phantom 钱包连接应用，在 NetworkSelector 中选择 "Ethereum Sepolia (ETH)" 后，
WalletInfoPanel 余额区域只显示静态占位符 `"— ETH"`，**没有显示实际的 ETH 余额**。

## 根因分析

`WalletInfoPanel.tsx` 中：

```tsx
{isSepolia ? (
  "— ETH"    // ← 硬编码占位，从不获取真实余额
) : ...}
```

当 `isSepolia === true` 时，代码直接返回静态字符串，没有调用 Phantom 的以太坊提供者（`window.phantom.ethereum` / `window.ethereum`）去获取 Sepolia 的 ETH 余额。

## 期望行为

1. [✅ 已确认] 选择 Sepolia 后，WalletInfoPanel 尝试通过 Phantom 的 EIP-1193 接口获取 Ethereum 账户
2. [✅ 已确认] 若 Phantom 已连接 Ethereum 账户，显示其 Sepolia ETH 余额（格式：`0.0000 ETH`）
3. [✅ 已确认] 若 Phantom 未连接 Ethereum 账户，显示提示信息 `— ETH`（保持现状，不强制弹出授权弹窗）
4. [⚠️ 假设] ETH 余额通过公共 Sepolia RPC 获取（无需安装额外依赖）
5. [⚠️ 假设] 不自动切换链，仅读取当前已连接的账户地址

## 范围

- **修改文件**：
  - `apps/web/src/components/wallet/solana/useEthBalance.ts`（新建）
  - `apps/web/src/components/wallet/solana/WalletInfoPanel.tsx`（更新）
- **不改动**：NetworkProvider、NetworkSelector、SolanaProvider、providers-dynamic
