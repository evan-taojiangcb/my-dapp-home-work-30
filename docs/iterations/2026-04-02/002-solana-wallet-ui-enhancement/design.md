# Design — Solana/Ethereum Dual-Chain Wallet UI Enhancement

## 基本信息

| 字段 | 值 |
|------|-----|
| 迭代目录 | docs/iterations/2026-04-02/002-solana-wallet-ui-enhancement/ |
| 依赖迭代 | 001-solana-phantom-feature |

---

## 1. Baseline 对齐

**既有架构**:

```
layout.tsx
  └── <ProvidersDynamic>
        └── <QueryClientProvider>
              └── <SolanaProvider> (dynamic, ssr:false)
                    └── ConnectionProvider(endpoint=DEVNET固定)
                          └── WalletProvider + WalletModalProvider
```

**既有约束**:
- `SolanaProvider` 的 `endpoint` 硬编码为 `https://api.devnet.solana.com`
- `Header` 无钱包内容
- 钱包 section 在 `page.tsx` 主内容区
- 余额使用 `useSolanaBalance(publicKey)` — query key 包含 `publicKey.toBase58()`

---

## 2. 设计决策

### DEC-001: 网络切换架构 — Context + Dynamic Endpoint

不通过重新创建 `ConnectionProvider` 来切换网络（那样会丢失钱包状态），而是通过 React Context 向下传递当前 `endpoint`，由 `ConnectionProvider` 在初始化时读取。

**问题**: `ConnectionProvider` 的 `endpoint` prop 在初始化后不可变。
**解法**: 当 `endpoint` 变化时，整个 `SolanaProvider` 需要重新创建。方案：将 `SolanaProvider` 的 `endpoint` 作为动态 prop，变化时自动重新挂载。

```tsx
// NetworkProvider: 管理当前选择的网络
// NetworkContext: 传递 endpoint
// 当 endpoint 变化 → SolanaProvider 重新挂载 → 钱包状态丢失（需重新连接）
```

**简化方案（本迭代采用）**: `NetworkContext` 存储用户选择，但切换网络时给出提示"切换网络将断开当前连接"让用户确认。或者更简单：**网络选择只做 UI 展示，Solana Devnet 是唯一实际可用的网络**，其他选项显示为 "即将支持" 或 "需安装 Ethereum 钱包"。

> **Sepolia/Ethereum 接入**属于后续迭代，需要独立实现 MetaMask 适配器。本迭代确认 Sepolia 在 UI 上可选，但仅作占位。

### DEC-002: Header 布局

```
[My Dapp]          [SolanaConnectButton]  [NetworkSelector ▼]
```

Header 接受 `SolanaConnectButton` 和 `NetworkSelector` 作为内嵌内容。使用 `flex items-center gap-3` 水平排列。

### DEC-003: 钱包信息实时同步

**无需额外实现**。现有架构已满足：
- `useWallet()` 返回的 `publicKey` 是 React Context 响应式值
- Phantom 切换账号 → `publicKey` 变化 → React 自动重新渲染 → `WalletInfoPanel` 地址更新
- `useSolanaBalance` 依赖 `publicKey` 作为 query key → key 变化自动触发新查询 → 余额更新
- React Query `staleTime: 30_000` → 30 秒后自动重新获取

---

## 3. 组件设计

### 3.1 `NetworkSelector` 组件

**文件**: `apps/web/src/components/wallet/solana/NetworkSelector.tsx`

**状态**: 本地 `selectedNetwork` state（类型为 `NetworkId`）。

**网络配置**:

```typescript
type NetworkId = "solana-devnet" | "ethereum-sepolia";

const NETWORKS: Record<NetworkId, { label: string; symbol: string; description: string }> = {
  "solana-devnet": { label: "Solana Devnet", symbol: "SOL", description: "Solana development network" },
  "ethereum-sepolia": { label: "Ethereum Sepolia", symbol: "ETH", description: "Ethereum testnet — requires Ethereum wallet" },
};
```

**UI**: 使用 `@solana/wallet-adapter-react-ui` 的下拉样式或简单的 HTML `<select>`。当前选中 `solana-devnet`。

**切换行为**:
- 选择 `ethereum-sepolia` → toast 提示 "请安装 Ethereum 钱包以连接 Sepolia 网络"
- 选择 `solana-devnet` → 正常工作

```tsx
export default function NetworkSelector() {
  const [selected, setSelected] = useState<NetworkId>("solana-devnet");
  const { selectedNetwork, setSelectedNetwork } = useNetworkContext();

  return (
    <select
      value={selected}
      onChange={(e) => {
        const next = e.target.value as NetworkId;
        if (next === "ethereum-sepolia") {
          toast("请安装 Ethereum 钱包以连接 Sepolia 网络");
          return;
        }
        setSelectedNetwork(next);
      }}
      className="rounded border bg-card px-2 py-1 text-sm"
    >
      {Object.entries(NETWORKS).map(([id, net]) => (
        <option key={id} value={id}>
          {net.label} ({net.symbol})
        </option>
      ))}
    </select>
  );
}
```

### 3.2 `useNetworkContext` Hook + `NetworkProvider`

**文件**: `apps/web/src/components/wallet/solana/NetworkProvider.tsx`

**为什么需要 Provider**: `ConnectionProvider` 的 `endpoint` prop 需要在初始化时传入。如果要在网络切换后使用新 endpoint，需要重建 `ConnectionProvider`。Provider 模式让子组件可以订阅网络变化。

**接口**:

```typescript
interface NetworkContextValue {
  networkId: NetworkId;
  endpoint: string; // 当前实际的 RPC endpoint
  isSepolia: boolean; // 是否为 Sepolia（无实际连接时）
}
```

**Provider 结构**:

```tsx
export function SolanaNetworkProvider({ children }) {
  const [networkId, setNetworkId] = useState<NetworkId>("solana-devnet");
  const endpoint = networkId === "solana-devnet"
    ? "https://api.devnet.solana.com"
    : ""; // Sepolia 无实际连接时用空字符串

  return (
    <NetworkContext.Provider value={{ networkId, endpoint, isSepolia: networkId === "ethereum-sepolia" }}>
      {children}
    </NetworkContext.Provider>
  );
}
```

### 3.3 Header 改造

**文件**: `apps/web/src/components/header.tsx`

```tsx
"use client";
import SolanaConnectButton from "./wallet/solana/SolanaConnectButton";
import NetworkSelector from "./wallet/solana/NetworkSelector";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="font-semibold">My Dapp</h1>
      <div className="flex items-center gap-3">
        <SolanaConnectButton />
        <NetworkSelector />
      </div>
    </header>
  );
}
```

### 3.4 `page.tsx` 钱包 section 样式

**目标**: 使用 `WalletInfoPanel` 的 `rounded-xl border bg-card p-4 space-y-3` 样式包裹整个钱包信息区域。

```tsx
<section className="rounded-xl border bg-card p-4 space-y-3">
  <h2 className="font-medium text-sm">Solana Wallet</h2>
  <WalletInfoPanel />
</section>
```

### 3.5 余额联动 — 币种切换

当 `networkId === "ethereum-sepolia"` 时，`WalletInfoPanel` 不显示 Solana 余额（因为无实际连接），改为显示占位符 "— ETH"。

```tsx
// WalletInfoPanel.tsx 中使用 useNetworkContext
const { networkId, isSepolia } = useNetworkContext();

{isSepolia ? (
  <p className="text-sm">— ETH</p>
) : (
  /* 原有 SOL 余额显示 */
)}
```

---

## 4. 文件变更清单

| 操作 | 文件 |
|------|------|
| 修改 | `apps/web/src/components/header.tsx` |
| 新增 | `apps/web/src/components/wallet/solana/NetworkSelector.tsx` |
| 新增 | `apps/web/src/components/wallet/solana/NetworkProvider.tsx` |
| 修改 | `apps/web/src/components/wallet/solana/index.ts` |
| 修改 | `apps/web/src/app/page.tsx` |
| 修改 | `apps/web/src/components/wallet/providers-dynamic.tsx`（可选，若需包裹 NetworkProvider） |

---

## 5. AC 追溯矩阵

| AC | 组件 | 验证点 |
|----|------|--------|
| AC-001 | `header.tsx` | Header 内 SolanaConnectButton 可见 |
| AC-002 | `NetworkSelector.tsx` | 下拉可选择网络，Sepolia 选项存在 |
| AC-003 | `NetworkProvider.tsx` + `useSolanaBalance.ts` | 切换网络后余额联动（Solana 网络切换触发重新查询）|
| AC-004 | `NetworkSelector.tsx` | Sepolia 选中时显示 toast 提示 |
| AC-005 | `page.tsx` | wallet section 使用 `rounded-xl border bg-card` |
| AC-006 | `WalletInfoPanel.tsx` | Phantom 切换账号 → 地址响应式更新 |
| AC-007 | `useSolanaBalance.ts` | staleTime 30s → 自动重新获取 |

---

## 6. 安全考量

- **NetworkSelector 切换 Sepolia 时无实际私钥操作**：仅 UI 提示，无安全风险
- **不访问私钥**：所有区块链操作通过钱包 adapter 完成，前端代码不处理私钥
- **Clipboard**: 同既有实现（`WalletInfoPanel.copyAddress`），不变

---

## 7. 排除范围确认

- ❌ MetaMask/Ethereum 钱包实际接入 — 后续迭代
- ❌ 多钱包并行连接（Solana + Ethereum 同时）
- ❌ 主网 Solana 网络切换
- ❌ 交易签名 UI

---
*Generated by SDLC Workflow sdlc-doit — Step ③ design-generator*
