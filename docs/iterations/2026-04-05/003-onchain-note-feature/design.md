# Design — 数据上链（On-Chain Note）

## 引用基线
- 沿用既有结构（Better-T-Stack monorepo）
- 参考 004-transfer-panel-feature（状态机模式、EIP-1193 用法）
- 参考 005-wallet-transfer-bugfix（useWalletAccountSync 模式）
- 本次代码落位在 `apps/web/src/components/wallet/eth/`（ETH 模块），不新增顶级目录

---

## 目录影响
- **新增** `apps/web/src/components/wallet/eth/useOnChainNote.ts` — 业务 hook
- **新增** `apps/web/src/components/wallet/eth/OnChainNotePanel.tsx` — UI 组件
- **修改** `apps/web/src/app/eth-page/page.tsx` — 引入并渲染组件
- 不新增顶级目录，沿用 `apps/web/src/components/wallet/eth/`

---

## 架构设计

### 状态机
```
idle → sending → confirming → success
              ↘           ↘
               error ←─────┘
```

```ts
type NoteStatus = "idle" | "sending" | "confirming" | "success" | "error";
```

### Hook 设计：`useOnChainNote`

依赖 wagmi + viem，不再依赖 EIP-1193 手写 fetch：

```ts
import { useSendTransaction, useWaitForTransactionReceipt, useAccount, usePublicClient } from "wagmi";
import { toHex, hexToString, parseEther, formatGwei } from "viem";
```

**输入**：`noteText: string`（原始文本）
**输出**：
```ts
{
  address: `0x${string}` | undefined,
  status: NoteStatus,
  txHash: `0x${string}` | undefined,
  onChainHex: string | undefined,    // 回显：链上 data 字段
  onChainText: string | undefined,   // 回显：hex → 原文
  errorMsg: string | undefined,
  sendNote: () => Promise<void>,     // 触发上链
  hexPreview: string,                // 实时 hex 预览
}
```

**Gas 预检逻辑**：
1. `publicClient.estimateGas({ account, to: account, value: 0n, data: toHex(noteText) })`
2. `publicClient.getGasPrice()`
3. `publicClient.getBalance({ address: account })`
4. 判断 `balance < estimatedGas * gasPrice` → 提示余额不足

**链上读取**（success 后）：
```ts
const tx = await publicClient.getTransaction({ hash: txHash });
onChainHex = tx.input;
onChainText = hexToString(tx.input);
```

**账号同步**：
`useAccount` 返回 `address`，在 `useEffect(() => { resetAll() }, [address])` 中自动重置

### 组件设计：`OnChainNotePanel`

```
┌─────────────────────────────────────────┐
│  📝 On-Chain Note                        │
│  账号: 0xAbCd...1234    [当前网络 badge]  │
├─────────────────────────────────────────┤
│  [ 文本输入区 (max 500)            500/0 ]│
│  [ 0x68656c6c6f...  只读 hex 预览      ] │
│                                          │
│  Estimated gas: 0.000032 ETH            │
│                                          │
│        [ 发送附言到区块链 ]               │
├─────────────────────────────────────────┤
│  ✅ Tx Hash: 0xABCD...                   │
│  On-chain Hex: 0x68656c6c6f...          │
│  原文: hello                             │
└─────────────────────────────────────────┘

[全屏 loading overlay 在 sending/confirming 期间]
```

### 关键技术点

| 操作 | viem / wagmi API |
|------|-----------------|
| 文本→hex | `toHex(text)` |
| hex→文本 | `hexToString(hex)` |
| 发交易 | `useSendTransaction` → `sendTransaction({ to: address, value: 0n, data: toHex(text) })` |
| 等待确认 | `useWaitForTransactionReceipt({ hash })` |
| 读取链上交易 | `publicClient.getTransaction({ hash })` |
| 估算 gas | `publicClient.estimateGas(...)` |
| 格式化 gas | `formatGwei(gasPrice)` |

### 安全规则
- `toHex` 前截断 text 到 500 字符，防止超长 calldata
- 不暴露私钥，仅走 MetaMask 签名
- Gas 估算失败时给出友好提示，不阻断用户
