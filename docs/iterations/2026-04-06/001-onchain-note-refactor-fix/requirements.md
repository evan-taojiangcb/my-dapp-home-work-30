# Requirements — On-Chain Note: 重构 + 注释 + Bug 修复

**Change Size: Micro**
**Iteration**: 2026-04-06/001-onchain-note-refactor-fix

---

## 需求摘要

对上次迭代（003-onchain-note-feature）的三项后续改进：
1. 代码落位优化：页面专用组件移入对应 page 目录
2. 代码注释：补充 viem / wagmi API 说明，提升可读性
3. Bug 修复：本地网络发送 data 给 EOA 时报 "External transactions to internal accounts cannot include data"

---

## 影响范围

| 文件 | 操作 |
|------|------|
| `apps/web/src/app/eth-page/useOnChainNote.ts` | 新建（从 components/ 移入 + 注释 + bug 修复）|
| `apps/web/src/app/eth-page/OnChainNotePanel.tsx` | 新建（从 components/ 移入 + 注释）|
| `apps/web/src/app/eth-page/page.tsx` | 修改（更新 import 路径）|
| `apps/web/src/components/wallet/eth/useOnChainNote.ts` | 删除 |
| `apps/web/src/components/wallet/eth/OnChainNotePanel.tsx` | 删除 |

---

## Bug 根因分析

**错误**：`External transactions to internal accounts cannot include data`

**根因**：向自己（EOA）发送带 `data` 字段的交易时，Hardhat 本地节点将自己地址识别为"internal account"（节点托管的账号），并拒绝带有 calldata 的交易。Sepolia 主网也有 MetaMask 对 EOA 自转账带 data 的限制。

**修复方案**：将交易接收方改为 `0x000000000000000000000000000000000000dEaD`（通用 burn address）：
- 不受 internal account 限制
- value = 0 ETH，不会真正损失资产
- `tx.input` 字段依然保留完整 calldata，链上回显逻辑不变

---

## 验收条件

- [ ] 本地 Hardhat 网络可正常发送带 data 的交易，不报错
- [ ] Sepolia 网络可正常上链
- [ ] hex 预览、gas 估算、链上回显功能不退化
- [ ] 组件导入路径正确，页面正常渲染
