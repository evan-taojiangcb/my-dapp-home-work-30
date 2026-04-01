# Requirements: Phantom Wallet 集成

## 需求概述

**类型**: feature
**状态**: 已收录 + 澄清
**摘要**: 为 dApp 集成 Phantom 钱包连接功能，支持未来 ETH 和 SOL 转账场景

---

## 需求详述

### 1. 功能目标

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 钱包连接 | 用户可以通过 Phantom 钱包连接到 dApp | P0 |
| 钱包断开 | 用户可以断开已连接的钱包 | P0 |
| 余额展示 | 连接后展示钱包的 SOL 和 ETH 原生代币余额 | P1 |
| 多链支持 | Phantom 支持 Solana 链；Ethereum 链通过 wagmi + viem 支持 | P0 |

### 2. 技术选型

| 链 | 技术栈 | 说明 |
|----|--------|------|
| Solana | `@solana/wallet-adapter-react` + `@solana/wallet-adapter-react-ui` | Phantom 通过 Solana Wallet Standard 集成 |
| Ethereum | `wagmi` + `viem` + `@rainbow-me/rainbowkit` | 支持 MetaMask、Coinbase Wallet 等 |

### 3. 用户交互流程

```
[未连接状态]
  └── 点击 "连接钱包" 按钮
        └── 打开钱包选择弹窗（Phantom / MetaMask / Coinbase Wallet）
              └── 用户选择并授权
                    └── [已连接状态]
                          └── 展示钱包地址（短地址）
                          └── 展示 SOL 余额
                          └── 展示 ETH 余额（如适用）
                          └── "断开连接" 按钮
```

### 4. 部署环境约束

- **目标平台**: Cloudflare Workers (via Alchemy / OpenNextJS)
- **已知限制**:
  - Cloudflare Workers 不完全支持 `Buffer` 和某些 Node.js API
  - `@solana/wallet-adapter` 部分组件需要 polyfill 或替代方案
  - Ethereum 签名操作在 Workers 环境中需特殊处理

### 5. 验收标准

| ID | 标准 | 类型 | 状态 |
|----|------|------|------|
| AC-01 | 点击"连接钱包"按钮后，钱包选择弹窗正确打开 | 功能 | ⚠️ 假设: 使用 RainbowKit ConnectButton |
| AC-02 | 选择 Phantom 钱包后，Phantom 授权弹窗触发 | 功能 | ⚠️ 假设: Phantom 浏览器扩展已安装 |
| AC-03 | 授权成功后，UI 展示已连接钱包的短地址（格式: `0x1234...abcd`） | 功能 | ✅ 已确认 |
| AC-04 | 断开连接后，UI 回到未连接状态 | 功能 | ✅ 已确认 |
| AC-05 | 连接状态在页面刷新后保持（如适用） | 功能 | ⚠️ 假设: localStorage 持久化 |
| AC-06 | 在 Cloudflare Workers 环境下钱包连接正常工作 | 部署验收 | ⚠️ 假设: 需要 @opennextjs/cloudflare 兼容层 |

---

## 技术约束

1. **钱包适配器必须在 SSR/SSG 环境中安全运行**（不能用 `window` 全局对象做初始状态）
2. **部署在 Cloudflare Workers**，Solana web3.js 和 wallet-adapter 的某些 API 可能不兼容
3. **RainbowKit 必须在 `transpilePackages` 中配置** 以兼容 Next.js
4. **所有钱包连接状态必须通过 React Context 管理**

---

## 已确认事实

| # | 事实 | 依据 |
|---|------|------|
| AF-01 | Phantom 支持 Solana 和 Ethereum（EVM）两种链 | Phantom 官方文档 |
| AF-02 | 项目使用 Next.js 16 + Cloudflare Workers 部署 | turbo.json + package.json |
| AF-03 | `apps/web` 是主前端应用，使用 React Query + tRPC | package.json dependencies |
| AF-04 | `@opennextjs/cloudflare` 已安装在 web 包中 | package.json |

---

## 假设（待确认）

| # | 假设 | 置信度 | 影响 |
|---|------|--------|------|
| AS-01 | Phantom SOL 余额通过 Solana RPC 获取（无需额外 API key） | 高 | 低 - 可直接实现 |
| AS-02 | ETH 余额通过 wagmi 的 `useBalance` hook 获取 | 高 | 低 - wagmi 标准用法 |
| AS-03 | RainbowKit 的 `injected()` connector 通过 EIP-6963 检测 Phantom（`window.phantom.ethereum`） | 高 | 低 - injected 已内置 |
| AS-04 | Cloudflare Workers 环境下需要使用 `@opennextjs/cloudflare` 兼容层 | 高 | 高 - 架构影响 |
| AS-05 | session 持久化使用 localStorage | 中 | 低 - 可调整 |

---

## 低置信度问题（已标注假设，流程继续）

| # | 问题 | 假设 |
|---|------|------|
| Q-01 | 是否需要支持 WalletConnect 协议（非浏览器扩展钱包）？ | 假设暂不需要，专注浏览器扩展 |
| Q-02 | 连接后的 session 持久化方式？（localStorage / memory） | 假设 localStorage |
| Q-03 | 是否需要展示 NFT 代币余额？ | 假设暂不需要，只展示原生代币余额 |
| Q-04 | Ethereum 链是否只需要 Mainnet，还是需要 Goerli/Sepolia 测试网？ | 假设 Mainnet + Sepolia 测试网 |

---

## 代码落位

| 文件 | 职责 |
|------|------|
| `apps/web/src/components/wallet/` | 钱包连接相关组件（ethereum-provider, solana-provider, wallet-button, wallet-display） |
| `apps/web/src/components/providers.tsx` | 全局 Providers 注册（WalletProvider 挂载点） |
| `packages/env/src/web.ts` | 新增 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, NEXT_PUBLIC_ALCHEMY_API_KEY schema |
| `apps/web/next.config.ts` | RainbowKit transpilePackages 配置 |
