# Design — Solana Phantom Wallet Integration

## 基本信息

| 字段 | 值 |
|------|-----|
| 需求 | REQ-001 |
| 日期 | 2026-04-02 |
| 迭代目录 | docs/iterations/2026-04-02/001-solana-phantom-feature/ |
| 版本 | v2（修复 Gate 1 问题） |

---

## 1. 技术方案

### 1.1 整体架构

沿用 **Better-T-Stack** `apps/web` 前端结构：
- Solana 钱包 Provider 新建于 `apps/web/src/components/wallet/`
- 遵循 Next.js App Router + React 19 规范
- 使用 `dynamic import` + `ssr: false` 解决 SSR 问题

### 1.2 Baseline 对齐（本设计新增章节）

> 引用 `docs/EXISTING_STRUCTURE.md` 约束：

- **apps/web 职责边界**（[EXISTING_STRUCTURE.md:41](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/docs/EXISTING_STRUCTURE.md#L41)）：Web 前端负责页面渲染和钱包连接，本设计未越界
- **trpc.ts 保护项**（[EXISTING_STRUCTURE.md:64](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/docs/EXISTING_STRUCTURE.md#L64)）：不修改 `apps/web/src/utils/trpc.ts`；复用其 `queryClient` 作为 React Query 入口
- **禁止变更项**：不修改 `packages/api`、`packages/db`、`packages/env`
- **Header 缺失**：当前 `layout.tsx` 依赖的 `@/components/header` 已被删除（[commit bf4c1a0](https://github.com/evan-taojiangcb/my-dapp-home-work-30/commit/bf4c1a0)），属于**前置阻塞**，不在本迭代范围内，需另行处理

### 1.3 组件结构

```
apps/web/src/components/wallet/
├── solana/
│   ├── SolanaProvider.tsx       # ConnectionProvider + WalletProvider 封装
│   ├── SolanaConnectButton.tsx  # WalletMultiButton 封装（自定义 label）
│   ├── WalletInfoPanel.tsx      # 地址/网络/余额展示
│   ├── useSolanaBalance.ts      # 余额查询 hook
│   └── index.ts                 # 导出
└── providers-dynamic.tsx        # 动态加载 SolanaProvider + QueryClientProvider（SSR safe）
```

### 1.4 依赖关系

```
layout.tsx
  └── <ProvidersDynamic>  (dynamic import, ssr: false)
        └── <QueryClientProvider client={queryClient}>  ← 复用 trpc.ts 的 queryClient
              └── <SolanaProvider>
                    ├── ConnectionProvider (endpoint: https://api.devnet.solana.com)
                    ├── WalletProvider (wallets: [PhantomWalletAdapter], autoConnect: true)
                    └── WalletModalProvider
                          └── children
```

---

## 2. 文件详细设计

### 2.0 `package.json` 依赖补充（本设计新增）

**位置**：`apps/web/package.json`

新增依赖：
```json
"@solana/wallet-adapter-wallets": "^0.19.32"
```

> **说明**：`PhantomWalletAdapter` 在 `@solana/wallet-adapter-wallets` 包中重新导出，必须作为直接依赖声明，不得依赖传递依赖的隐式存在。

### 2.1 `providers-dynamic.tsx`（新建）

**位置**：`apps/web/src/components/wallet/providers-dynamic.tsx`

```tsx
"use client";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/trpc";

// SSR: false → 组件只在客户端加载，解决 WalletAdapter SSR 问题
const SolanaProvider = dynamic(
  () => import("./solana/SolanaProvider"),
  { ssr: false }
);

export default function ProvidersDynamic({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>{children}</SolanaProvider>
    </QueryClientProvider>
  );
}
```

**关键修复**：
- 显式组合 `QueryClientProvider`，复用 `trpc.ts` 中的 `queryClient`（不另起新实例）
- 保护 `apps/web/src/utils/trpc.ts` 的既有 `queryClient` 定义

### 2.2 `solana/SolanaProvider.tsx`（新建）

**位置**：`apps/web/src/components/wallet/solana/SolanaProvider.tsx`

```tsx
"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import type { ReactNode } from "react";

const SOLANA_DEVNET_ENDPOINT = "https://api.devnet.solana.com";

const wallets = [new PhantomWalletAdapter()];

export default function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={SOLANA_DEVNET_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### 2.3 `solana/SolanaConnectButton.tsx`（新建）

**位置**：`apps/web/src/components/wallet/solana/SolanaConnectButton.tsx`

```tsx
"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

// 自定义 label：未连接时显示 "Connect to Phantom"（满足 AC-001）
const PHANTOM_LABELS = {
  "change-wallet": "Change wallet",
  connecting: "Connecting ...",
  "copy-address": "Copy address",
  copied: "Copied!",
  disconnect: "Disconnect",
  "has-wallet": "Connect to Phantom",  // AC-001: 修复默认 "Connect"
  "no-wallet": "Connect to Phantom",   // AC-001: 修复默认 "Select Wallet"
};

export default function SolanaConnectButton() {
  return <WalletMultiButton className="wallet-button" labels={PHANTOM_LABELS} />;
}
```

**关键修复**：通过 `labels` prop 覆盖默认文案，使 `AC-001` 精确文案 "Connect to Phantom" 生效。

### 2.4 `solana/useSolanaBalance.ts`（新建）

**位置**：`apps/web/src/components/wallet/solana/useSolanaBalance.ts`

```tsx
"use client";
import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { PublicKey } from "@solana/web3.js";

export function useSolanaBalance(publicKey: PublicKey | null) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["solana-balance", publicKey?.toBase58()],
    queryFn: async () => {
      if (!publicKey) return 0;
      try {
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
      } catch {
        return null; // 查询失败返回 null，UI 展示 "— SOL"
      }
    },
    enabled: !!publicKey,
    staleTime: 30_000,
  });
}
```

**关键修复**：添加 `import type { PublicKey }` 解决 TS 类型缺失。

### 2.5 `solana/WalletInfoPanel.tsx`（新建）

**位置**：`apps/web/src/components/wallet/solana/WalletInfoPanel.tsx`

```tsx
"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaBalance } from "./useSolanaBalance";

function formatAddress(pk: string) {
  return `${pk.slice(0, 4)}...${pk.slice(-4)}`;
}

// 带完整错误处理的 clipboard 复制
async function copyAddress(text: string): Promise<void> {
  if (typeof navigator === "undefined") return;
  try {
    // 需在安全上下文中（HTTPS）才能使用 clipboard
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // 降级：创建临时 input 元素
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  } catch {
    // 静默失败，不影响 UI
  }
}

export default function WalletInfoPanel() {
  const { publicKey, connected, disconnect } = useWallet();
  const { data: balance, isLoading } = useSolanaBalance(publicKey ?? null);

  if (!connected || !publicKey) return null;

  const address = publicKey.toBase58();

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-sm">Solana Wallet</h3>

      {/* 地址（可点击复制） */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Address</p>
        <button
          onClick={() => copyAddress(address)}
          className="font-mono text-sm hover:text-primary transition-colors"
          title="Click to copy full address"
        >
          {formatAddress(address)}
        </button>
      </div>

      {/* 网络 */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Network</p>
        <p className="text-sm">Solana Devnet</p>
      </div>

      {/* 余额 */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Balance</p>
        <p className="text-sm">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : balance !== null ? (
            `${balance.toFixed(4)} SOL`
          ) : (
            "— SOL"
          )}
        </p>
      </div>

      {/* 断开连接 */}
      <button
        onClick={() => disconnect()}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}
```

**关键修复**：
- `copyAddress()` 增加 `try/catch`、HTTPS 安全上下文检查、降级 fallback
- `useSolanaBalance` 传入 `publicKey ?? null`（null 安全处理）

### 2.6 `solana/index.ts`（新建）

```tsx
export { default as SolanaConnectButton } from "./SolanaConnectButton";
export { default as WalletInfoPanel } from "./WalletInfoPanel";
export { default as SolanaProvider } from "./SolanaProvider";
export { useSolanaBalance } from "./useSolanaBalance";
```

### 2.7 `page.tsx` 修改

**位置**：`apps/web/src/app/page.tsx`

```tsx
// 新增导入（第 4-5 行）
import SolanaConnectButton from "@/components/wallet/solana/SolanaConnectButton";
import WalletInfoPanel from "@/components/wallet/solana/WalletInfoPanel";

// 在 <section> 前新增钱包区域
<div className="flex flex-col gap-4">
  <SolanaConnectButton />
  <WalletInfoPanel />
</div>

// 现有 section 保持不变
```

### 2.8 `layout.tsx` 修改

**位置**：`apps/web/src/app/layout.tsx`

```tsx
// 修改第 5-6 行：
// 之前（broken）:
import WalletDynamicProviders from "@/components/providers-dynamic";
import Header from "@/components/header";

// 之后（fixed，providers 部分）:
import ProvidersDynamic from "@/components/wallet/providers-dynamic";
// Header 组件已不存在，属 pre-existing issue，需另行处理
```

> **注意**：`@/components/header` 的缺失是 pre-existing issue，不在本迭代范围内。layout.tsx 在本次修改后仍会因 Header 缺失而报错，需由前置任务处理。

---

## 3. API 设计

无新增 API 端点，纯前端实现。

- 余额查询：`connection.getBalance(publicKey)` → Solana Devnet RPC（HTTPS）

---

## 4. 数据流

```
用户点击 "Connect to Phantom"
  → PhantomWalletAdapter → 用户在 Phantom 弹窗中授权
  → useWallet() publicKey 更新 → connected = true
  → WalletInfoPanel 检测 connected=true，自动渲染
  → useSolanaBalance() 触发 queryFn
    → connection.getBalance(publicKey)  → Devnet RPC
    → 返回 lamports / LAMPORTS_PER_SOL → SOL 余额
  → UI 渲染地址（前4后4）、网络、余额
```

---

## 5. 安全考量

| 风险 | 缓解措施 |
|------|---------|
| 私钥泄露 | ✅ 不访问私钥，只用 `publicKey` 读链上数据 |
| XSS / 数据注入 | ✅ React 默认转义，无 `dangerouslySetInnerHTML`；链上数据直接展示不做解析 |
| Phishing | ✅ Phantom 官方授权弹窗，用户主动授权，不可强连 |
| Clipboard 失败 | ✅ `copyAddress()` 含 `try/catch` + `isSecureContext` 检查 + `execCommand` fallback |
| Devnet RPC 单点 | ⚠️ 使用公共 HTTPS 端点，存在限流/可用性风险；本次固定 Devnet，后续可集中配置 |

---

## 6. 偏离记录

| 偏离项 | 原因 |
|--------|------|
| 不使用 `packages/api` | 纯前端功能，不需要 tRPC 层 |
| 不修改 `packages/env` | 本次不涉及 env schema 变更 |
| 不使用 `WalletConnect` | 用户需求明确指定 Phantom |
| 新增 `@solana/wallet-adapter-wallets` | PhantomWalletAdapter 需从该包导入，必须显式声明 |

---

## 7. AC  traceability matrix（本设计新增章节）

| AC ID | 验收条件 | 满足方式 | 验证方法 |
|-------|---------|---------|---------|
| AC-001 | 页面加载后显示 "Connect to Phantom" 按钮 | `SolanaConnectButton` 的 `labels.no-wallet = "Connect to Phantom"` | 页面渲染后观察按钮文案 |
| AC-002 | 点击后弹出 Phantom 授权界面 | `WalletMultiButton` 内部调用 `setModalVisible(true)` → Phantom 官方 UI | 手动点击按钮，验证弹窗 |
| AC-003 | 连接后显示截断地址 | `WalletInfoPanel` 使用 `formatAddress()` → `7r4h...9Kp4` 形式 | 连接后观察 |
| AC-004 | 连接后显示 "Solana Devnet" | `WalletInfoPanel` 硬编码文案 "Solana Devnet" | 连接后观察 |
| AC-005 | 连接后显示 SOL 余额 | `useSolanaBalance` → `connection.getBalance()` → 4 位小数 | 连接后观察 |
| AC-006 | 断开后 UI 恢复到未连接状态 | `WalletInfoPanel` 在 `!connected` 时返回 `null`；按钮自动恢复 | 点击 Disconnect 后验证 |
| AC-007 | Phantom 未安装时显示 "Install Phantom" | `WalletMultiButton` 内置此行为（`buttonState === 'no-wallet'` 且无已安装钱包时） | 浏览器无 Phantom 扩展时测试 |
| AC-008 | 刷新页面自动重连（autoConnect） | `WalletProvider` 配置 `autoConnect={true}` | 连接后刷新页面 |

---

## 8. 验收条件

| # | 条件 | 对应 AC |
|---|------|---------|
| 1 | `layout.tsx` 引入 `ProvidersDynamic` 无 SSR 错误 | — |
| 2 | 未连接时显示 "Connect to Phantom" | AC-001 |
| 3 | 点击按钮弹出 Phantom 授权界面 | AC-002 |
| 4 | 连接成功后显示截断地址 | AC-003 |
| 5 | 连接成功后显示 "Solana Devnet" | AC-004 |
| 6 | 连接成功后显示 SOL 余额 | AC-005 |
| 7 | 点击 Disconnect 后 UI 恢复 | AC-006 |
| 8 | Phantom 未安装时显示安装提示 | AC-007 |
| 9 | 刷新页面后自动重连 | AC-008 |

---

## 9. 参考

- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Next.js dynamic import](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- 上次迭代：`docs/iterations/2026-04-01/001-phantom-wallet-feature/`（参考，非沿用）

---
*Generated by SDLC Workflow sdlc-doit — Step ③ design-generator (v2, post-Gate-1 fixes)*
