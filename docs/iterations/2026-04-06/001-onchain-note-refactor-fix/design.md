# Design — On-Chain Note: 重构 + 注释 + Bug 修复

**流程升级：sdlc-doit**（mini Gate 1 FAIL → 目录结构调整超出 mini 范围）
沿用既有结构（Better-T-Stack monorepo，apps/web 内文件重新落位）

---

## 目录影响声明

| 操作 | 路径 |
|------|------|
| 新增 | `apps/web/src/app/eth-page/useOnChainNote.ts` |
| 新增 | `apps/web/src/app/eth-page/OnChainNotePanel.tsx` |
| 修改 | `apps/web/src/app/eth-page/page.tsx`（更新 import）|
| 删除 | `apps/web/src/components/wallet/eth/useOnChainNote.ts` |
| 删除 | `apps/web/src/components/wallet/eth/OnChainNotePanel.tsx` |

**为什么需要移位（不能复用现有位置）**：`components/wallet/eth/` 应只存放跨页面复用的通用组件（如 `eth-provider.tsx`、`eth-header.tsx`）。`OnChainNotePanel` 和 `useOnChainNote` 仅服务 eth-page，属页面专属代码，应落在 `app/eth-page/` 中，符合 Next.js App Router 的 co-location 规范。

**本次变更是 approved 的目录结构调整**：无新增顶级目录，不影响 monorepo workspace 划分。

---

## Bug 修复详情

**错误**：`External transactions to internal accounts cannot include data`

**根因**：Hardhat 本地节点对 managed accounts（"internal accounts"）发送带 data 的交易会拒绝，部分 MetaMask 配置对 EOA 自转账+data 也有限制。

**修复**：将 `to` 从自身地址改为 burn address，同时确保 `value: 0n` 不变量：

```diff
// sendNote()
  const hash = await sendTransactionAsync({
-   to: address,
+   to: MEMO_RECEIVER,   // burn address: 0x000...dEaD
    value: 0n,           // INVARIANT: 永远为 0，禁止修改
    data: toHex(trimmed),
  });

// estimateGas effect
  publicClient.estimateGas({
    account: address,
-   to: address,
+   to: MEMO_RECEIVER,   // burn address，与 sendNote 保持一致
    value: 0n,           // INVARIANT: 永远为 0
    data,
  })
```

- 链上回显仍通过 `tx.input`（calldata）读取，不依赖 `to` 字段，功能不退化
- `MEMO_RECEIVER` 定义为顶层常量 `"0x000000000000000000000000000000000000dEaD" as const`

---

## 注释策略

### wagmi / viem API 说明注释
在 `useOnChainNote.ts` 的每个 hook / 函数调用处添加中文块注释：

| API | 说明注释内容 |
|-----|------------|
| `useAccount` | 从 wagmi context 获取当前账号地址（address）和链 ID（chainId），用于 sendNote 和 estimateGas 的 account 参数 |
| `usePublicClient` | viem 只读客户端，无需签名；用于 `estimateGas`（预算 gas）和 `getTransaction`（取 calldata 回显）；account/chainId 变化时重新实例化 |
| `useSendTransaction` | 向 MetaMask 发起签名请求并广播交易；返回 `sendTransactionAsync`（Promise）+ `isPending`（弹窗等待中）|
| `useWaitForTransactionReceipt` | 轮询 / WebSocket 监听交易回执；`isLoading` 为 true 表示已广播但未确认；`isSuccess` 触发链上回显读取 |
| `toHex(text)` | viem 工具函数：UTF-8 字符串 → `0x` 十六进制；作为交易 calldata（`data` 字段）写入链上 |
| `hexToString(hex)` | viem 工具函数：`0x` 十六进制 → UTF-8 字符串；从 `getTransaction().input` 取 calldata 后还原原文 |
| `formatEther(wei)` | viem 工具函数：BigInt wei → 人类可读 ETH 字符串（`1000000000000000n` → `"0.001"`）|
| `estimateGas` | publicClient 方法：模拟本笔交易并返回所需 gas 单位（BigInt）；不广播上链，不消耗真实 gas |

### 状态机注释
在 hook 顶部用注释描述完整状态转换，帮助读者理解 `status` 字段的含义：

```
状态机：
  idle → encoding（输入非空）→ idle（输入清空）
  idle → estimating（debounce 600ms 后触发 estimateGas）
  idle → sending（用户点击「上链」→ MetaMask 弹窗签名）
  sending → confirming（MetaMask 签名完成，tx 广播）
  confirming → echoing（区块确认，isSuccess = true，读取 tx.input）
  echoing → success（getTransaction 返回，calldata 解码完成）

  任意状态 → idle（账号/链切换：useEffect 监听 address/chainId 变化后 reset）
  任意状态 → error（网络异常 / 用户拒绝签名 / Hardhat 节点拒绝）
```

### 关键逻辑注释点
- **`value: 0n` 不变量**：两处必须加注释，说明这是防止意外转账的硬约束，不得修改
- **burn address 的用途**：注释说明为何不用 `address`（自身），防止后人"修复"回去
- **debounce 取消**：`estimateGas` 的 useEffect cleanup 函数必须注释说明，防止 unmount 时的陈旧回调更新 state
- **`tx.input` 依赖**：链上回显读取的是 `getTransaction().input`（calldata），与 `to` 字段无关；需注释说明，否则读者可能误以为 to 必须是自身
- **decode 失败分支**：`hexToString` 可能抛出（非 UTF-8 hex），须在 try/catch 内执行；注释中说明 fallback 策略（显示原始 hex）

---

## 安全边界

1. **0 ETH 不变量**：`value` 字段在 `sendNote` 和 `estimateGas` 中均为 `0n`；任何修改 value 的 PR 必须拒绝
2. **不渲染 HTML**：链上回显只能用 `<pre>{echoText}</pre>` 或纯文本节点输出；禁止 `dangerouslySetInnerHTML`（XSS 防护）
3. **500 字符 calldata 限制**：已在输入侧限制，`sendNote` 内部也应 guard：`if (trimmed.length > 500) throw new Error("note too long")`；注释说明 1 字节 = 1 gas-unit calldata
4. **burn address 不可修改**：`MEMO_RECEIVER` 定义为常量，注释标注不可改回用户自身地址

---

## 验收方式

1. `pnpm tsc --noEmit` 全量通过
2. Vitest 19 个单元测试通过（import 路径随文件移动更新）
3. 删除旧文件后无悬挂 import（grep `components/wallet/eth/useOnChainNote` 无匹配）

