# Architecture

## 系统概要

Web3 DApp，支持 Ethereum 和 Solana 双链钱包连接。前端使用 Next.js App Router，后端使用 tRPC + Cloudflare Workers。

## 技术栈

- **前端**: Next.js 16 (App Router), React 19, TailwindCSS 4, shadcn/ui
- **状态/数据**: TanStack Query (React Query) v5, tRPC v11
- **钱包集成**: @solana/wallet-adapter (React UI + Phantom adapter)
- **区块链**: @solana/web3.js v1, Ethereum via WalletConnect-style (待接入)
- **部署**: Cloudflare Pages + Workers (OpenNext.js adapter)
- **Monorepo**: pnpm workspaces, Turbo v2

## 目录约定

```
apps/
├── web/          # Web 前端 (Next.js)
│   └── src/
│       ├── app/               # Next.js App Router 页面
│       ├── components/        # React 组件
│       │   ├── wallet/        # 钱包集成组件
│       │   │   ├── solana/    # Solana 钱包
│       │   │   │   ├── SolanaProvider.tsx      # ConnectionProvider + WalletProvider + WalletModalProvider
│       │   │   │   ├── SolanaConnectButton.tsx  # BaseWalletMultiButton 连接按钮
│       │   │   │   ├── WalletInfoPanel.tsx     # 地址/网络/余额显示
│       │   │   │   ├── NetworkSelector.tsx      # 网络下拉选择器
│       │   │   │   ├── NetworkProvider.tsx      # 网络 Context (networkId, endpoint, isSepolia)
│       │   │   │   ├── useSolanaBalance.ts      # SOL 余额查询 hook
│       │   │   │   └── index.ts
│       │   │   └── providers-dynamic.tsx  # 动态加载 Provider (ssr: false) + NetworkProvider
│       │   └── ...
│       └── utils/trpc.ts      # tRPC 客户端单例
│   └── tests/                 # Vitest 单元测试 (apps/web 内)
├── server/       # Cloudflare Workers (tRPC 路由)
packages/
├── config/       # ESLint / TypeScript 共享配置
├── env/          # 环境变量 schema 验证
├── api/          # tRPC 路由定义
├── auth/         # 认证逻辑
├── db/           # Drizzle ORM schema + 客户端
└── ui/           # 共享 UI 组件库
```

## 模块结构

### apps/web

- 负责所有前端 UI 渲染和用户交互
- **wallet/solana/** 模块：Solana 钱包连接 UI（支持 Devnet + Sepolia 网络选择）
  - `SolanaProvider`: Provider 链，读 `NetworkContext` 的 `endpoint`（`ConnectionProvider` → `WalletProvider` → `WalletModalProvider`）
  - `SolanaConnectButton`: 触发钱包连接（`BaseWalletMultiButton` + 自定义 labels，头部横向排列）
  - `WalletInfoPanel`: 连接后显示地址/当前网络/余额；Sepolia 模式显示 "— ETH" 占位符
  - `NetworkProvider`: 网络 Context（`networkId`、`endpoint`、`isSepolia`）
  - `NetworkSelector`: 下拉选择器，支持 Solana Devnet / Ethereum Sepolia
  - `useSolanaBalance`: SOL 余额查询 hook（React Query，`queryKey` 包含 `networkId`）
  - `providers-dynamic`: 动态加载 Provider（`ssr: false`）并包裹 `NetworkProvider`
- `Header`: 顶部导航栏，水平横向排列 `SolanaConnectButton` + `NetworkSelector`
- tRPC `QueryClient` 使用 `apps/web/src/utils/trpc.ts` 中的单例，不自行创建

### apps/server

- tRPC 路由暴露 REST API
- 提供 `healthCheck` 等端点

### packages/api

- tRPC router 定义
- context 构建

## 数据流

```
用户点击 "Connect to Phantom"
  → BaseWalletMultiButton (no-wallet state) → 打开 WalletModal
    → 用户选择 Phantom → PhantomWalletAdapter.connect()
      → 钱包公钥写入 React Context（useWallet）
        → useSolanaBalance(publicKey, networkId) 启用 React Query
          → connection.getBalance(publicKey) via Solana Devnet RPC
            → 余额显示在 WalletInfoPanel

用户切换网络（NetworkSelector）
  → setNetworkId(newNetworkId)
    → NetworkContext 更新 → SolanaProvider 内部重新渲染
      → ConnectionProvider 使用新 endpoint 重新创建连接
        → useSolanaBalance 触发 re-fetch（新 queryKey 包含 networkId）
          → 余额/网络/币种显示同步更新

Phantom 切换账号（Phantom 弹窗内操作）
  → useWallet().publicKey 变更
    → 组件树自动 re-render
      → useSolanaBalance 触发 re-fetch（新 queryKey 包含新 publicKey）
        → WalletInfoPanel 地址/余额自动更新
```

## 外部依赖

| 依赖 | 用途 | 约束 |
|------|------|------|
| `api.devnet.solana.com` | Solana Devnet RPC | 支持 Devnet，Sepolia 为占位符 |
| `@solana/wallet-adapter-react-ui` | 钱包连接 UI | 需 `ssr: false` 动态加载 |
| `@tanstack/react-query` | React Query v5 | 使用 `apps/web/src/utils/trpc.ts` 中的 `queryClient` 单例 |
| `sonner` | Toast 通知 | NetworkSelector 切换提示 |

## 钱包集成设计

### SSR 兼容性

`PhantomWalletAdapter` 在模块初始化时访问 `window`。Next.js SSR 阶段无 `window`，会导致错误。解决方案：

```tsx
// providers-dynamic.tsx
const SolanaProvider = dynamic(() => import("./solana/SolanaProvider"), { ssr: false });
```

### Provider 链

```
<QueryClientProvider client={queryClient}>   // 使用 trpc.ts 中的单例
  <NetworkProvider>                          // 网络 Context（networkId, endpoint, isSepolia）
    <SolanaProvider>                          // 动态加载（ssr: false），内部读取 network.endpoint
      {children}
    </SolanaProvider>
  </NetworkProvider>
</QueryClientProvider>
```

**SolanaProvider 内部逻辑**：根据 `network.endpoint` 决定渲染内容：
- 有 endpoint（Solana Devnet）→ 正常渲染 `ConnectionProvider` → `WalletProvider` → `WalletModalProvider`
- 空 endpoint（Sepolia）→ 直接渲染 children（占位符，不建立实际连接）

### 钱包按钮标签 (AC-001 / AC-007)

- `no-wallet` → "Connect to Phantom"（无钱包扩展时显示）
- `has-wallet` → "Connect"（保持默认，不覆盖）
- "Install Phantom" 提示由 WalletModal 触发，不在按钮标签层

### 余额查询

- `useSolanaBalance(publicKey)` 使用 `enabled: !!publicKey` 控制查询启用
- React Query 默认重试 3 次，失败后 `isError: true` → UI 显示 "— SOL"
- 异常不吞掉，由 React Query 处理
- `staleTime: 30_000`（30 秒）

## 部署架构

- Cloudflare Pages (Next.js) + Cloudflare Workers (tRPC API)
- `open-next.config.ts` 配置 Cloudflare Workers 适配器
- 环境变量通过 `packages/env` 的 Zod schema 验证

## 目录偏离记录

- `apps/web/tests/unit/` 位于 `apps/web/` 内而非 monorepo 根 `tests/unit/web/`：原因：pnpm monorepo 默认 `shamefully-hoist=false`，workspace packages 无法从根目录 node_modules 解析。将测试放在 apps/web 内确保 vitest 能正确解析 `@solana/wallet-adapter-*` 和 `@tanstack/react-query`。
