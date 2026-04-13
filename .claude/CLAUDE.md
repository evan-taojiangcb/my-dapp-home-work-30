# my-dapp-home-work-30

## 项目概述
Web3 全栈 DApp，基于 Better-T-Stack 的 Monorepo 架构。集成 Ethereum（Sepolia）和 Solana（Devnet）双链钱包，支持 Phantom / WalletConnect，使用 Hono + tRPC 提供后端 API，Drizzle ORM + SQLite 持久化，Cloudflare Workers 部署前端，Hardhat 管理 Solidity 合约（MessageBoard、ReadPack）。

## 技术栈
- **前端**：Next.js 16 App Router、React 19、Tailwind CSS v4、RainbowKit、wagmi、viem
- **后端**：Hono、tRPC 11、@hono/node-server
- **数据库**：Drizzle ORM + SQLite（drizzle-kit）
- **Web3**：@solana/web3.js、@solana/wallet-adapter（Phantom）、Alchemy（Ethereum RPC）
- **合约**：Hardhat、Solidity（packages/contracts）— MessageBoard、ReadPack、USDCRedPacket（OpenZeppelin ReentrancyGuard + SafeERC20）
- **部署**：Cloudflare Workers（@opennextjs/cloudflare）、Wrangler、Alchemy
- **Monorepo**：Turbo 2 + pnpm catalogs

## 目录结构
<!-- 请描述项目目录结构 -->

## 开发约定
- 参考 .claude/ARCHITECTURE.md 了解架构设计
- 参考 .claude/SECURITY.md 了解安全规范
- 参考 .claude/CODING_GUIDELINES.md 了解编码规范
- 若项目为 existing project，先参考 `.claude/PROJECT_BASELINE.md`、`.claude/EXISTING_STRUCTURE.md`、`.claude/TEST_BASELINE.md`
- 使用 Conventional Commits 格式提交
- 默认遵循 Better-T-Stack 风格目录：
  - `apps/web/src` 放 Web 前端代码
  - `apps/server/src` 放后端代码
  - `packages/config` 为基础包
  - `packages/env|api|auth|db|infra|ui` 按能力启用并承载共享逻辑
- 默认不新建根目录级 `web/`、`api/`、`server/` 等目录，除非设计文档明确批准

## 迭代历史

历史迭代记录存放在 `docs/iterations/` 目录下，按日期和需求顺序组织：

```
docs/iterations/
└── YYYY-MM-DD/
    └── <序号>-<需求名>-<变更类型>/
        ├── requirements.md    # 结构化需求
        ├── design.md          # 技术设计
        ├── tasks.md           # 任务分解
        └── status.json        # proposal/apply 状态
```

**在处理新需求时，务必先阅读 `docs/iterations/` 下的历史迭代**，了解已有的设计决策、架构变更和业务上下文，避免：
- 与已有设计冲突
- 重复实现已存在的功能
- 引入与历史决策矛盾的方案

**若项目已经有既有技术架构，不得把它当 fresh project 重建目录。** 必须先尊重 baseline，再决定是否需要结构调整。

## SDLC Workflow
本项目使用 sdlc-workflow 技能进行自动化开发。
- 首次接入运行 `/sdlc-workflow init`
- 需求拆解运行 `/sdlc-workflow proposal <需求>` → 等待人工审核
- 审核通过后运行 `/sdlc-workflow apply <迭代目录>` → 开发到 PR
- 全自动模式运行 `/sdlc-workflow doit <需求>`
- 小任务运行 `/sdlc-workflow mini <需求>`
- 配置见 `.env` 文件
