# Architecture

## 系统概要
<!-- 请描述系统整体架构 -->

## 技术栈
<!-- 列出核心技术选型及版本 -->

**钱包 & Web3**:
- `wagmi` v2 + `viem` v2 — Ethereum 交互
- `@rainbow-me/rainbowkit` v2 — EVM 钱包连接 UI
- `@solana/wallet-adapter-react` + `@solana/wallet-adapter-phantom` — Solana 钱包

## 目录约定

默认采用 Better-T-Stack 风格 monorepo：

```text
apps/
├── web/          # Web 前端
├── server/       # 后端 API / BFF / Worker
├── native/       # 移动端（可选）
└── docs/         # 文档站点（可选）

packages/
├── config/       # 始终存在
├── env/          # 存在前端或后端时
├── api/          # 启用 API 层时
├── auth/         # 启用认证时
├── db/           # 启用数据库 + ORM 时
├── infra/        # 启用 Cloudflare / infra 时
└── ui/           # React Web 共享 UI 时
```

约束：

- Web UI 和页面逻辑默认放在 `apps/web/src/`
- 后端入口、路由、服务默认放在 `apps/server/src/`
- 共享逻辑优先进入 `packages/*`，并根据所选能力启用对应包
- 默认不新增根目录级 `web/`、`server/`、`api/`、`frontend/`、`backend/`
- 若偏离该结构，必须记录原因和影响范围

## 模块结构
<!-- 描述主要模块及其职责 -->

建议至少说明：

- `apps/web` 负责什么
- `apps/server` 负责什么
- `packages/*` 中有哪些共享模块
- 哪些模块禁止跨层直接依赖

### 钱包模块 (`apps/web/src/components/wallet/`)

| 文件 | 职责 |
|------|------|
| `wallet-providers.tsx` | 统一：wagmi v2 + RainbowKit v2 + Solana adapter（ssr:false 内运行）|
| `wallet-button.tsx` | RainbowKit ConnectButton，EVM 连接入口 |
| `providers-dynamic.tsx` | 动态入口（`ssr:false`），防止 WalletConnect indexedDB SSR 错误 |
| `providers.tsx` | Base providers（Theme + trpc QueryClient + Toaster，**无钱包导入**）|

**Provider 嵌套顺序**（由外到内）:
`layout.tsx` → `WalletDynamicProviders(ssr:false)` → `Providers` → `WagmiProvider` → `QueryClientProvider(wagmi)` → `RainbowKitProvider` → `SolanaProvider` → `WalletModalProvider` → `children`

**SSR 安全机制**: 整个钱包模块通过 `next/dynamic({ ssr: false })` 加载，确保 WalletConnect SignClient（使用 indexedDB）永不服务端执行。`ReactQueryDevtools` 也位于 `ssr:false` 树内以访问 `QueryClientProvider`。

## 数据流
<!-- 描述数据如何在系统中流转 -->

## 外部依赖
<!-- 列出外部服务、API、数据库等 -->

### 钱包服务

| 服务 | 用途 | 配置变量 |
|------|------|----------|
| WalletConnect | EVM 钱包连接 | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` |
| Alchemy | Ethereum RPC 节点 | `NEXT_PUBLIC_ALCHEMY_API_KEY` |
| Phantom | Solana 钱包连接 | 无需 API Key |
| Solana RPC | Solana 集群通信 | `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_SOLANA_CLUSTER` |

## 部署架构
<!-- 描述部署环境和方式 -->

## 目录偏离记录
<!-- 若未采用上述 monorepo 结构，在这里记录原因、风险和后续迁移计划 -->
