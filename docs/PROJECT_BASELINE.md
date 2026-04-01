# PROJECT_BASELINE.md

## 项目概述

| 字段 | 值 |
|------|-----|
| **项目根路径** | `/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30` |
| **包管理器** | pnpm 10.30.3 |
| **Workspace 类型** | pnpm monorepo (`pnpm-workspace.yaml`) |
| **构建系统** | Turborepo 2.8.12 |
| **Node.js 运行时** | Node.js (via Bun for server compile) |
| **TypeScript 版本** | TypeScript 5 |

## 核心技术栈

| 层级 | 技术 | 位置 |
|------|------|------|
| 前端框架 | Next.js 16.2 (App Router) | `apps/web`, `apps/fumadocs` |
| 后端框架 | Hono | `apps/server` |
| API 层 | tRPC 11 | `apps/web`, `apps/server`, `packages/api` |
| ORM | Drizzle ORM | `packages/db` |
| 数据库 | PostgreSQL | 外部依赖 |
| UI 组件 | shadcn/ui + Base UI | `packages/ui` |
| CSS | Tailwind CSS 4 + CSS Modules | `packages/ui` |
| 区块链 | Alchemy (Cloudflare Workers) | `apps/web`, `packages/infra` |
| 部署目标 | Cloudflare Workers | `apps/web` |

## 工作区结构

```
apps/
├── fumadocs/    # 文档站点 (Next.js MDX)
├── server/      # API 服务器 (Hono + tRPC)
└── web/         # 主 Web 应用 (Next.js)
packages/
├── api/         # tRPC API 路由与业务逻辑
├── config/      # 共享 TypeScript 配置
├── db/          # Drizzle schema 与查询
├── env/         # 环境变量校验 (t3-oss/env)
├── infra/       # Cloudflare/Alchemy 部署配置
└── ui/          # 共享 UI 组件库
```

## 可识别的运行脚本

| 脚本 | 命令 | 说明 |
|------|------|------|
| `pnpm dev` | `turbo dev` | 启动所有应用开发服务器 |
| `pnpm build` | `turbo build` | 构建所有应用 |
| `pnpm check-types` | `turbo check-types` | TypeScript 类型检查 |
| `pnpm dev:web` | `turbo -F web dev` | 仅启动 Web 应用 |
| `pnpm dev:server` | `turbo -F server dev` | 仅启动 Server |
| `pnpm db:push` | `turbo -F @my-dapp-home-work-30/db db:push` | 推送 DB schema |
| `pnpm db:studio` | `turbo -F @my-dapp-home-work-30/db db:studio` | 打开 Drizzle Studio |
| `pnpm db:generate` | `turbo -F @my-dapp-home-work-30/db db:generate` | 生成 DB 类型 |
| `pnpm deploy` | `turbo -F @my-dapp-home-work-30/infra deploy` | 部署到 Cloudflare |

## 外部依赖

| 依赖 | 说明 |
|------|------|
| PostgreSQL | 数据库（外部托管） |
| Cloudflare | 部署目标 |
| Alchemy | 区块链 API 与部署工具 |
| Telegram | 通知渠道（通过 OpenClaw） |

## Verified Facts

- ✅ 项目基于 Better-T-Stack 模板创建
- ✅ 使用 pnpm workspaces 实现 monorepo
- ✅ Turborepo 作为构建编排工具
- ✅ Next.js 16.2 用于前端（支持 Turbopack）
- ✅ tRPC 实现端到端类型安全的 API 调用
- ✅ Drizzle ORM 管理 PostgreSQL schema
- ✅ shadcn/ui 作为 UI 组件基础
- ✅ Cloudflare Workers 作为部署目标（通过 Alchemy）
- ✅ 使用 `packages/infra` 和 `.env` 管理 Cloudflare credentials

## Claimed but Unverified

- ⚠️ `apps/fumadocs` 的实际功能范围和使用状态未验证
- ⚠️ `packages/api` 中 tRPC 路由的完整清单未验证
- ⚠️ 区块链相关功能（钱包连接、Web3 交互）的具体实现未验证
- ⚠️ 现有的 session/token 存储方案未验证
