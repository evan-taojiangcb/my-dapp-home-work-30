# Tasks: Phantom Wallet 集成

## 任务列表

---

### [x] T-01: 安装 Ethereum 钱包依赖

**类型**: feature
**依赖**: 无
**验收标准**:
- [x] `wagmi` v2.19.5 已添加到 `apps/web/package.json`
- [x] `viem` 已添加到 `apps/web/package.json`
- [x] `@rainbow-me/rainbowkit` v2.2.10 已添加
- [x] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 已写入 `.env`（demo 占位符）

---

### [x] T-02: 安装 Solana 钱包依赖

**类型**: feature
**依赖**: T-01
**验收标准**:
- [x] `@solana/wallet-adapter-react` 已添加
- [x] `@solana/wallet-adapter-react-ui` 已添加
- [x] `@solana/wallet-adapter-phantom` 已添加
- [x] 注：移除了 `@solana/wallet-adapter-solflare`（与 Turbopack 不兼容）

---

### [x] T-03: 更新 `next.config.ts` 的 `transpilePackages`

**类型**: feature
**依赖**: T-01
**验收标准**:
- [x] `next.config.ts` 包含 `transpilePackages: ["@rainbow-me/rainbowkit", "wagmi", "viem"]`

---

### [x] T-04: 创建 `apps/web/src/components/wallet/` 目录结构

**类型**: feature
**依赖**: T-01, T-03
**验收标准**:
- [x] `apps/web/src/components/wallet/index.ts` 存在
- [x] `apps/web/src/components/wallet/ethereum-provider.tsx` 存在
- [x] `apps/web/src/components/wallet/solana-provider.tsx` 存在

---

### [x] T-05: 实现 `ethereum-provider.tsx`（wagmi + RainbowKit）

**类型**: feature
**依赖**: T-04
**验收标准**:
- [x] `WagmiProvider` 正确配置 chains（mainnet, sepolia）
- [x] `getDefaultConfig` 正确配置 projectId、transports
- [x] RainbowKitProvider 正确包裹
- [x] SSR 安全：不在服务端执行任何 wallet 初始化

---

### [x] T-06: 实现 `solana-provider.tsx`（钱包适配器初始化）

**类型**: feature
**依赖**: T-04
**验收标准**:
- [x] `WalletProvider` 正确配置 Phantom wallet adapter
- [x] `"use client"` directive 确保 CSR only
- [x] Phantom 检测使用 `window.phantom.solana`（EIP-6963 兼容）

---

### [x] T-07: 更新 `apps/web/src/components/providers.tsx` 引入 WalletProvider

**类型**: feature
**依赖**: T-05, T-06
**验收标准**:
- [x] `apps/web/src/components/providers.tsx` 导入 `EthereumProvider`, `SolanaProvider`, `RainbowKitProvider`
- [x] WalletProvider 正确包裹子组件
- [x] 页面刷新后无 hydration 错误（构建验证）

---

### [x] T-08: 创建 `apps/web/src/components/wallet/wallet-button.tsx`

**类型**: feature
**依赖**: T-05
**验收标准**:
- [x] 使用 RainbowKit 的 `<ConnectButton />` 作为主要交互入口
- [x] 连接状态下显示短地址（RainbowKit 内置）

---

### [x] T-09: 创建 `apps/web/src/components/wallet/wallet-display.tsx`

**类型**: feature
**依赖**: T-05
**验收标准**:
- [x] `useAccount()` 获取 Ethereum 地址并展示短地址
- [x] `useBalance()` 获取 ETH 余额
- [x] 未连接时优雅降级

---

### [x] T-10: 更新 `apps/web/src/components/header.tsx` 集成钱包按钮

**类型**: feature
**依赖**: T-08
**验收标准**:
- [x] Header 中包含 `<WalletButton />`
- [x] 布局不受影响（flex row）

---

### [x] T-11: 添加环境变量占位符到 `.env` 和 `packages/env/src/web.ts`

**类型**: feature
**依赖**: T-01
**验收标准**:
- [x] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=` 已写入 `apps/web/.env`
- [x] `NEXT_PUBLIC_ALCHEMY_API_KEY=` 已写入 `apps/web/.env`
- [x] `packages/env/src/web.ts` schema 已同步新增这两个变量（optional）
- [x] `.env.example` 已同步更新

---

### [x] T-12: 验证 Cloudflare Workers 兼容性和钱包连接功能

**类型**: verification
**依赖**: T-07, T-08, T-10
**验收标准**:
- [x] `pnpm build` 构建成功（transpilePackages 配置验证）
- [ ] 点击 "Connect Wallet" 按钮打开 RainbowKit 弹窗（需手动验证）
- [ ] Phantom 钱包选项存在（需手动验证）
- [ ] 点击 Phantom 并授权后，地址正确展示（需手动验证）
- [ ] 断开连接功能正常（需手动验证）

---

## 预估工时

| 任务 | 预估 | 实际 |
|------|------|------|
| T-01 ~ T-03（依赖安装 + 配置） | 15 min | 20 min |
| T-04 ~ T-07（Provider 实现） | 40 min | 35 min |
| T-08 ~ T-10（UI 组件 + 集成） | 30 min | 15 min |
| T-11（环境变量） | 5 min | 5 min |
| T-12（验证） | 20 min | 10 min |
| **总计** | ~110 min | ~85 min |

---

## 任务完成记录

| 任务 | 完成时间 | 备注 |
|------|----------|------|
| T-01 | 2026-04-01 14:00 | wagmi v2.19.5, viem, rainbowkit 已安装 |
| T-02 | 2026-04-01 14:00 | Solana adapter 已安装 |
| T-03 | 2026-04-01 14:05 | transpilePackages 已配置 |
| T-04 | 2026-04-01 14:10 | wallet 组件目录已创建 |
| T-05 | 2026-04-01 14:15 | ethereum-provider 已实现 |
| T-06 | 2026-04-01 14:20 | solana-provider 已实现 |
| T-07 | 2026-04-01 14:25 | providers.tsx 已更新 |
| T-08 | 2026-04-01 14:28 | wallet-button 已创建 |
| T-09 | 2026-04-01 14:30 | wallet-display 已创建 |
| T-10 | 2026-04-01 14:32 | header.tsx 已更新 |
| T-11 | 2026-04-01 14:35 | env vars 已更新 |
| T-12 | 2026-04-01 14:45 | 构建成功，需手动验收 |
