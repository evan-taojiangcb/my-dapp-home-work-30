# Requirements — 数据上链（On-Chain Note）

## 需求 ID: REQ-2026-04-05-003

## 来源
docs/requirments/4-4-1.md

---

## R-01 网络 [✅ 已确认]
使用当前 MetaMask 钱包所选网络，支持 Sepolia 和本地测试网。

## R-02 附言转账 [✅ 已确认]
- 转账金额固定为 0 ETH
- 转账目标地址 = 当前账号地址（自转账）
- 附言文本编码为 hex，作为交易的 `data` 字段上链

## R-03 附言输入组件 [✅ 已确认]
- 顶部只读展示：当前账号地址
- 文本输入框：最大 500 字符，实时联动
- 只读 hex 预览框：文本→hex 实时转换（`0x` 前缀）
- "发送附言"按钮：
  - 校验文本非空
  - 校验账号已连接
  - 预估 gas + 检查余额是否能覆盖 gas
  - 点击触发发交易

## R-04 状态管理 [✅ 已确认]
- 发送中显示全屏 loading overlay，禁止用户交互
- 实时显示交易 hash（pending 期间也显示）
- 成功/失败后解除 loading

## R-05 链上回显组件 [✅ 已确认]
交易成功后，根据 hash 回读链上数据并展示：
- hash（只读）
- 链上 hex data（只读）
- 原文（只读，hex → UTF-8 string）

## R-06 账号同步 [✅ 已确认]
账号切换时清空表单和回显区域，绑定 wagmi `useAccount` 监听地址变化

## R-07 技术约束 [✅ 已确认]
- 使用 wagmi hooks（`useSendTransaction`、`useWaitForTransactionReceipt`、`useAccount`、`usePublicClient`）
- 使用 viem 工具函数（`toHex`、`hexToString`、`parseEther`、`formatGwei`）
- 不依赖 ethers.js（项目未安装，viem 承担相同职责）
- 代码落位：`apps/web/src/components/wallet/eth/` + `apps/web/src/app/eth-page/page.tsx`
