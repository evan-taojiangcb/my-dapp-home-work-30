# Design: Phantom Wallet 集成

## 概述

**迭代目录**: `docs/iterations/2026-04-01/001-phantom-wallet-feature/`
**类型**: feature
**状态**: 已实现 + SSR 修复（commit b610c57）
**落点**: `apps/web/src/components/wallet/` + `apps/web/src/components/providers.tsx` + `packages/env/src/web.ts`

---

## 0. 实现历程

| 阶段 | 变更 | 说明 |
|------|------|------|
| 初始实现 | T-01 ~ T-11 | wagmi + RainbowKit + Solana adapter 安装和集成 |
| SSR 修复 | b610c57 | 解决 WalletConnect SignClient（indexedDB）和 ReactQueryDevtools 的 SSR 错误 |

### SSR 修复说明（b610c57）

**问题 1**: `indexedDB is not defined` — WalletConnect `SignClient` 在 Next.js SSR/SSG 阶段被初始化（模块级别导入）

**问题 2**: `No QueryClient set` — `ReactQueryDevtools` 位于 `providers.tsx`（base），服务端渲染时无 `QueryClientProvider`

**解决方案**:

```
layout.tsx (Server Component)
└── WalletDynamicProviders (ssr:false)
    └── Providers (ThemeProvider + trpc QueryClientProvider + Toaster)
        └── WalletProviders
            ├── WagmiProvider
            │   └── QueryClientProvider (wagmi 专用)
            │       ├── RainbowKitProvider
            │       │   └── SolanaProvider
            │       │       └── WalletModalProvider
            │       └── ReactQueryDevtools  ← 已从 base providers 移入
```

**关键决策**:
- `providers.tsx` 只保留 base providers，**不再导入任何钱包模块**
- `providers-dynamic.tsx` — `"use client"` + `next/dynamic` + `ssr: false` 包裹整个钱包树
- `wallet-providers.tsx` — 统一的 wagmi + RainbowKit + Solana（所有导入在模块级别，因 ssr:false 永不服务端执行）
- `ReactQueryDevtools` 必须放在 `WalletDynamicProviders` 内（需要 `QueryClientProvider`）

---

## 1. 技术方案

### 1.1 架构决策

| 链 | 方案 | 理由 |
|----|------|------|
| Solana | `@solana/wallet-adapter-react` + `@solana/wallet-adapter-phantom` | Phantom 官方适配器；连接/签名在浏览器扩展中，SSR 隔离即可 |
| Ethereum | `wagmi` v2 + `viem` + `@rainbow-me/rainbowkit` v2 | RainbowKit v2 的 `getDefaultConfig` 内置 connectors；`injected()` 自动检测 `window.phantom.ethereum`（EIP-6963） |

### 1.2 SSR / Cloudflare Workers 兼容性

**问题**: WalletConnect `SignClient` 在导入时访问 `indexedDB`；`ReactQueryDevtools` 需要 `QueryClientProvider`。

**解决方案**: `next/dynamic` + `ssr: false` — 整个钱包模块树只在客户端加载，服务端返回空白占位。

### 1.3 实际文件结构

```
apps/web/src/
├── app/
│   └── layout.tsx                    # Server Component → WalletDynamicProviders (ssr:false)
├── components/
│   ├── providers.tsx                 # Base providers: Theme + trpc QueryClient + Toaster
│   ├── providers-dynamic.tsx        # "use client" + ssr:false 动态入口
│   └── wallet/
│       ├── wallet-providers.tsx      # 统一: wagmi + RainbowKit + Solana（ssr:false 内）
│       └── wallet-button.tsx         # RainbowKit ConnectButton
```

---

## 2. 组件设计

### 2.1 `apps/web/src/components/wallet/wallet-providers.tsx`

所有钱包 Provider 的统一入口（ssr:false 内运行，无 SSR 问题）：

```tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "viem";
import { useMemo } from "react";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo";
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "demo";

const wagmiConfig = getDefaultConfig({
  appName: "my-dapp-home-work-30",
  projectId,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
  },
});

const SOLANA_RPC_URL = `https://api.mainnet-beta.solana.com`;

function getPhantomAdapter(): PhantomWalletAdapter | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phantom = (window as any).phantom;
  const solana = phantom?.solana as { isPhantom?: boolean } | undefined;
  if (solana?.isPhantom) return new PhantomWalletAdapter();
  return null;
}

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const solanaEndpoint = useMemo(() => SOLANA_RPC_URL, []);
  const phantom = useMemo(() => getPhantomAdapter(), []);
  const solanaWallets = useMemo(() => (phantom ? [phantom] : []), [phantom]);
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <ConnectionProvider endpoint={solanaEndpoint}>
            <SolanaWalletProvider wallets={solanaWallets} autoConnect>
              <WalletModalProvider>{children}</WalletModalProvider>
            </SolanaWalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 2.2 `apps/web/src/components/providers-dynamic.tsx`

钱包 Provider 的动态入口（`ssr: false` 确保服务端不加载钱包模块）：

```tsx
"use client";

import dynamic from "next/dynamic";

const WalletProviders = dynamic(
  () => import("@/components/wallet/wallet-providers").then((m) => m.default),
  { ssr: false }
);

import Providers from "@/components/providers";

export default function WalletDynamicProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <WalletProviders>{children}</WalletProviders>
    </Providers>
  );
}
```

### 2.3 `apps/web/src/components/providers.tsx`（更新）

Base providers，**不再导入任何钱包模块**：

```tsx
"use client";

import { Toaster } from "@my-dapp-home-work-30/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient } from "@/utils/trpc";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
```

### 2.4 `apps/web/src/app/layout.tsx`（更新）

```tsx
import WalletDynamicProviders from "@/components/providers-dynamic";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="...">
        <WalletDynamicProviders>
          <Header />
          {children}
        </WalletDynamicProviders>
      </body>
    </html>
  );
}
```

### 2.5 `apps/web/src/components/wallet/wallet-button.tsx`

```tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletButton() {
  return <ConnectButton />;
}
```

### 2.6 `apps/web/src/components/header.tsx` 更新

```tsx
"use client";
import { WalletButton } from "./wallet/wallet-button";

export default function Header() {
  return (
    <div className="flex items-center gap-3">
      <WalletButton />
      <ModeToggle />
    </div>
  );
}
```

---

## 3. 配置变更

### 3.1 `apps/web/next.config.ts`

```ts
const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  transpilePackages: [
    "@rainbow-me/rainbowkit",
    "wagmi",
    "viem",
    "@tanstack/react-query",
  ],
};
```

### 3.2 `packages/env/src/web.ts`（新增 env vars）

```ts
export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
    NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  },
  emptyStringAsUndefined: true,
});
```

---

## 4. 安全性考量

| 风险 | 缓解措施 |
|------|----------|
| 恶意钱包扩展 | RainbowKit `injected()` 只连接用户主动触发的扩展；Phantom 需用户明确授权 |
| XSS 攻击 | React 默认转义；无 DOM 插入 |
| Chain 混淆 | wagmi 配置明确声明 `chains: [mainnet, sepolia]` |
| Phantom 扩展缺失 | RainbowKit fallback 到 MetaMask / WalletConnect |
| RPC 篡改 | 仅使用受信任 RPC（Alchemy）；余额读取不依赖外部三方 API |

---

## 5. 环境变量汇总

| 变量 | 用途 | 来源 |
|------|------|------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect 协议 + EVM RPC | [cloud.walletconnect.com](https://cloud.walletconnect.com) 免费注册 |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Ethereum RPC（主网 + Sepolia） | [alchemy.com](https://www.alchemy.com) 免费注册 |

---

## 6. 依赖安装清单

```bash
# Ethereum
pnpm add wagmi viem@2 @rainbow-me/rainbowkit@2 @tanstack/react-query

# Solana
pnpm add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-phantom @solana/web3.js
```

**注意**: `@solana/wallet-adapter-solflare` 因 Turbopack 兼容性问题已移除。

---

## 7. 目录偏离记录

| 偏离 | 原因 | 风险 |
|------|------|------|
| `apps/web/src/components/wallet/` | Better-T-Stack 默认 `providers/` 在 `apps/web/src/` | 低 - 符合 Next.js App Router 惯例 |
| `packages/env/src/web.ts` | 已有 env schema 需同步更新 | 低 - 必需配合 |

---

## 8. 既有结构延续说明

本设计**延续现有结构**，不调整任何既有架构：

- ✅ `apps/web/` 结构保持不变（仅新增 wallet 子目录）
- ✅ `packages/ui/` 保持不变
- ✅ `apps/server/` 不受影响
- ✅ Provider 挂载点：`apps/web/src/components/providers.tsx` → `WalletDynamicProviders`（ssr:false）

---

## 9. 验收标准映射

| ID | 验收标准 | 实现方式 |
|----|----------|----------|
| AC-01 | 点击"连接钱包"按钮后弹窗打开 | RainbowKit `<ConnectButton />` → wallet modal |
| AC-02 | Phantom 授权弹窗触发 | `injected()` connector → Phantom 扩展授权 |
| AC-03 | UI 展示已连接钱包短地址 | RainbowKit ConnectButton 内置 |
| AC-04 | 断开连接后 UI 回到未连接状态 | RainbowKit 内置 disconnect |
| AC-05 | 刷新后连接状态保持 | RainbowKit 内置 localStorage persistence |
| AC-06 | SSR/SSG 环境下无错误 | `ssr: false` 动态导入；钱包代码仅客户端执行 |
