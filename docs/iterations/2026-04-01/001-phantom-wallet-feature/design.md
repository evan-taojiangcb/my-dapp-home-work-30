# Design: Phantom Wallet 集成

## 概述

**迭代目录**: `docs/iterations/2026-04-01/001-phantom-wallet-feature/`
**类型**: feature
**状态**: 设计修订（基于 Gate 1 反馈）
**落点**: `apps/web/src/components/wallet/` + `apps/web/src/providers/` + `packages/env/src/web.ts`

---

## 0. Gate 1 修订说明

Codex 审查发现以下问题，已修订：

| # | 问题 | 修复 |
|---|------|------|
| 1 | RainbowKit 是 EVM only，无法覆盖 Solana/Phantom 连接流 | 分立两套：RainbowKit（EVM）+ Solana Adapter（Solana） |
| 2 | Phantom EVM 通过 injected 连接，非 WalletConnect | Phantom injected 通过 `window.phantom.ethereum` 检测 |
| 3 | "Solana 签名不可用" 是错误结论；签名在客户端，SSR 隔离即可 | 移除错误结论，改为正确的 SSR 隔离方案 |
| 4 | Provider 挂载点写错：实际在 `components/providers.tsx` | 修正挂载路径 |
| 5 | wagmi 配置缺少 `createConfig`/`transports`/RPC 映射 | 补充完整 wagmi v2 配置 |
| 6 | Solana 侧缺少完整设计（余额、cluster、持久化） | 补充完整 Solana 设计 |
| 7 | 安全章节缺少 chain allowlist、错误处理、fallback | 补充完整安全设计 |
| 8 | 环境变量未覆盖 `packages/env/src/web.ts` schema | 同步更新 env schema |

---

## 1. 技术方案

### 1.1 架构决策

| 链 | 方案 | 理由 |
|----|------|------|
| Solana | `@solana/wallet-adapter-react` + `@solana/wallet-adapter-react-ui` | Phantom 官方推荐的 Solana Wallet Standard；连接/签名都在客户端，SSR 隔离可解决 CF Workers 兼容性 |
| Ethereum | `wagmi` v2 + `viem` + `@rainbow-me/rainbowkit` v2 | RainbowKit 的 `injected()` connector 会自动检测 `window.phantom.ethereum`（EIP-6963） |

### 1.2 Cloudflare Workers 兼容性策略

**问题**: `@solana/wallet-adapter` 在服务端执行时使用 Node.js API（Buffer 等），CF Workers 不支持。

**正确理解**: Phantom 的连接/签名发生在**浏览器扩展**中，不在 Worker 里。Worker 端只是 SSR 渲染，客户端 JavaScript 才真正调用钱包 API。

**解决方案**:
1. **SSR 隔离**: Solana wallet-adapter 用 `next/dynamic` + `ssr: false` 加载，只在客户端初始化
2. **Provider 隔离**: `SolanaProvider` 和 `EthereumProvider` 都用 CSR-only 组件包裹
3. **服务端无害**: Provider 在服务端渲染时返回 null，不调用任何 wallet API

### 1.3 Provider 挂载位置（已修正）

```
apps/web/src/
├── components/
│   ├── providers.tsx          # 现有：Theme + QueryClient + Toaster
│   └── wallet/
│       ├── index.ts           # 统一导出
│       ├── solana-provider.tsx   # Solana wallet-adapter provider（CSR）
│       └── ethereum-provider.tsx # wagmi + RainbowKit provider（CSR）
├── app/
│   └── layout.tsx            # 引用 components/providers.tsx（不变）
```

**注意**: `layout.tsx` 导入的是 `@/components/providers`，不是 `app/providers.tsx`。

---

## 2. 组件设计

### 2.1 `packages/env/src/web.ts` 变更（新增 env vars）

```ts
// 新增环境变量 schema
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1), // WalletConnect Cloud project ID
NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1),         // Alchemy API key for RPC
```

### 2.2 `apps/web/src/components/wallet/ethereum-provider.tsx`

```tsx
"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors"; // EIP-6963 兼容：自动检测 window.phantom.ethereum
import { createTransport, http } from "viem";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!;

export const wagmiConfig = getDefaultConfig({
  appName: "my-dapp-home-work-30",
  projectId, // WalletConnect project ID (必需)
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`),
  },
  connectors: [
    injected({ target: "phantom" }), // 优先检测 Phantom
    injected(),                       // fallback 到其他注入钱包（MetaMask 等）
    walletConnect({ projectId }),
    coinbaseWallet({ appName: "my-dapp-home-work-30" }),
  ],
});

const queryClient = new QueryClient();

export function EthereumProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* RainbowKit 的 <RainbowKitProvider> 在 app/providers.tsx 通过 @rainbow-me/rainbowkit 获取 */}
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 2.3 `apps/web/src/components/wallet/solana-provider.tsx`

```tsx
"use client";

import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

// 样式导入（必需）
import "@solana/wallet-adapter-react-ui/styles.css";

// Solana cluster 配置：mainnet-beta | devnet | testnet
const SOLANA_CLUSTER = "mainnet-beta";
const SOLANA_RPC_URL = `https://api.${SOLANA_CLUSTER}.solana.com`;

// Phantom 检测函数（EIP-6963 / 旧版兼容）
function getPhantomAdapter() {
  if (typeof window === "undefined") return null;
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) return new PhantomWalletAdapter();
  return null;
}

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => SOLANA_RPC_URL, []);

  const wallets = useMemo(() => {
    const adapters = [
      getPhantomAdapter(),
      new SolflareWalletAdapter(),
    ].filter(Boolean) as any[];
    return adapters;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
```

### 2.4 `apps/web/src/components/providers.tsx`（更新）

```tsx
"use client";

import { Toaster } from "@my-dapp-home-work-30/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { queryClient } from "@/utils/trpc";
import { EthereumProvider, wagmiConfig } from "@/components/wallet/ethereum-provider";
import { SolanaProvider } from "@/components/wallet/solana-provider";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <EthereumProvider>
          <SolanaProvider>
            <RainbowKitProvider theme={darkTheme()} config={wagmiConfig}>
              {children}
            </RainbowKitProvider>
          </SolanaProvider>
        </EthereumProvider>
      </QueryClientProvider>
      <ReactQueryDevtools />
      <Toaster richColors />
    </ThemeProvider>
  );
}
```

### 2.5 `apps/web/src/components/wallet/wallet-button.tsx`

```tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { useCallback } from "react";

export function WalletButton() {
  return <ConnectButton />;
}

// 可选：独立的 Solana 连接按钮（用于 Solana 专属场景）
export function SolanaConnectButton() {
  // 使用 @solana/wallet-adapter-react-ui 的 useWallet
  // 注意：这个只在需要分开展示 Solana/Ethereum 时使用
  return null; // 暂时不需要，RainbowKit 的 modal 已覆盖
}
```

### 2.6 `apps/web/src/components/wallet/wallet-display.tsx`

```tsx
"use client";

import { useAccount, useBalance, useDisconnect } from "wagmi";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

// 格式化地址为短格式
function shortAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function EthereumWalletDisplay() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono">{shortAddress(address)}</span>
      {balance && <span className="text-xs opacity-70">{balance.formatted} {balance.symbol}</span>}
      <button onClick={() => disconnect()} className="text-xs underline">Disconnect</button>
    </div>
  );
}

export function SolanaWalletDisplay() {
  const { connection } = useConnection();
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const disconnectSolana = useCallback(() => {
    disconnect();
  }, [disconnect]);

  if (!connected || !publicKey) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono">{shortAddress(publicKey.toBase58())}</span>
      <button onClick={disconnectSolana} className="text-xs underline">Disconnect</button>
    </div>
  );
}

export function WalletDisplay() {
  return (
    <div className="flex items-center gap-4">
      <EthereumWalletDisplay />
      <SolanaWalletDisplay />
    </div>
  );
}
```

### 2.7 `apps/web/src/components/header.tsx` 更新

```tsx
// 在 header 的右侧区域添加
import { WalletButton } from "@/components/wallet/wallet-button";

export default function Header() {
  return (
    // ... existing nav ...
    <div className="flex items-center gap-2">
      <ModeToggle />
      <WalletButton />
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
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    // 新增
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  },
  emptyStringAsUndefined: true,
});
```

### 3.3 `apps/web/.env`（新增）

```env
# WalletConnect Project ID (免费注册: https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Alchemy API Key (免费注册: https://www.alchemy.com/)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
```

---

## 4. 安全性考量

| 风险 | 缓解措施 |
|------|----------|
| 恶意钱包扩展 | RainbowKit `injected()` 只连接用户主动触发的扩展；Phantom 需用户明确授权 |
| XSS 攻击 | 地址展示使用格式化函数，不做 DOM 插入；React 默认转义 |
| Phishing | RainbowKit 连接前展示钱包地址确认；用户主动授权是唯一入口 |
| Chain 混淆 | wagmi 配置明确声明 `chains: [mainnet, sepolia]`，不自动切换 |
| Provider 识别冲突 | EIP-6963 标准检测 `window.phantom.ethereum`，多钱包共存时用户选择 |
| Phantom 扩展缺失 | RainbowKit fallback 到 MetaMask / WalletConnect |
| 断开后状态清理 | RainbowKit 和 Solana adapter 断开时自动清理 localStorage |
| RPC 篡改 | 仅使用受信任 RPC（Alchemy）；余额读取不依赖外部三方 API |

---

## 5. 环境变量汇总

| 变量 | 用途 | 来源 |
|------|------|------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect 协议 + EVM RPC | [cloud.walletconnect.com](https://cloud.walletconnect.com) 免费注册 |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Ethereum RPC（主网 + Sepolia） | [alchemy.com](https://www.alchemy.com) 免费注册 |

**注意**: 两个 key 可以用同一个 WalletConnect Project ID（Alchemy 有免费 tier）

---

## 6. 依赖安装清单

```bash
# Ethereum
pnpm add wagmi viem@2.x @rainbow-me/rainbowkit@2.x @tanstack/react-query

# Solana
pnpm add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-phantom @solana/wallet-adapter-solflare \
  @solana/web3.js
```

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
- ✅ `turbo.json` 不变
- ✅ `pnpm-workspace.yaml` 不变
- ✅ `packages/env/src/web.ts` **同步更新**（新增 env vars schema）
- ✅ Provider 挂载点修正为 `apps/web/src/components/providers.tsx`

---

## 9. 验收标准映射

| ID | 验收标准 | 实现方式 |
|----|----------|----------|
| AC-01 | 点击"连接钱包"按钮后弹窗打开 | RainbowKit `<ConnectButton />` → 打开 wallet modal |
| AC-02 | 选择 Phantom 钱包后，Phantom 授权弹窗触发 | `injected({ target: "phantom" })` connector → 触发 Phantom 扩展授权 |
| AC-03 | UI 展示已连接钱包短地址 | `useAccount()` → `shortAddress()` 格式化 |
| AC-04 | 断开连接后 UI 回到未连接状态 | `useDisconnect()` hook |
| AC-05 | 刷新后连接状态保持 | RainbowKit 内置 localStorage persistence |
| AC-06 | Cloudflare Workers 环境下正常工作 | `ssr: false` 动态导入；Provider CSR-only 隔离 |
