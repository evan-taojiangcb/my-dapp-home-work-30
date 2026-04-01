# EXISTING_STRUCTURE.md

## 目录树概览

```
my-dapp-home-work-30/
├── apps/
│   ├── fumadocs/          # MDX 文档生成 (Next.js)
│   ├── server/            # Hono + tRPC API 服务器
│   └── web/               # 主 Web 应用 (Next.js + Cloudflare)
├── packages/
│   ├── api/               # tRPC 路由定义
│   ├── config/            # TypeScript 配置共享包
│   ├── db/                # Drizzle ORM schema
│   ├── env/               # 环境变量类型校验
│   ├── infra/             # Cloudflare/Alchemy 部署
│   └── ui/                # shadcn/ui 组件库
├── docs/                  # 项目文档
├── tests/                 # 测试目录 (SDLC Workflow)
│   ├── unit/
│   │   ├── packages/
│   │   ├── server/
│   │   └── web/
│   ├── e2e/
│   └── reports/
├── .claude/               # Claude Code 配置
├── turbo.json             # Turborepo 配置
├── pnpm-workspace.yaml     # pnpm workspace 配置
└── package.json           # 根 workspace 配置
```

## 每个 Workspace 的职责

| Workspace | 职责 | 关键文件 |
|-----------|------|----------|
| `apps/web` | 主前端应用，Next.js 16 + tRPC + React Query + Cloudflare 部署 | `next.config.ts`, `app/` |
| `apps/server` | API 服务器，Hono + tRPC Server | `src/index.ts` |
| `apps/fumadocs` | MDX 文档站点 | `next.config.ts` |
| `packages/api` | tRPC 路由与 API 业务逻辑复用 | `src/` |
| `packages/db` | Drizzle ORM schema 与数据库操作 | `src/`, `drizzle.config.ts` |
| `packages/env` | 环境变量类型校验（server/web 分离） | `src/server.ts`, `src/web.ts` |
| `packages/ui` | 共享 UI 组件、样式、hooks | `src/components/`, `src/styles/` |
| `packages/infra` | Alchemy/Cloudflare 部署配置 | `.env`, `wrangler.json` |
| `packages/config` | TypeScript tsconfig 扩展 | `tsconfig.json` |

## 现有目录偏离默认约定的地方

| 位置 | 偏离内容 | 说明 |
|------|----------|------|
| `apps/fumadocs` | 非默认应用，增加了文档站点 | 与 Better-T-Stack 模板的 `apps/web` + `apps/server` 不同 |
| `packages/infra` | 独立部署配置包 | 通常部署配置在 app 内，此处单独成包 |
| `apps/web` 使用 `opennextjs/cloudflare` | 部署路径特殊 | 通过 Alchemy 部署到 Cloudflare Workers |

## 哪些目录属于历史事实（禁止随意变更）

- **`apps/web/` 结构** — 已通过 Alchemy 绑定 Cloudflare，修改部署路径需重新配置
- **`packages/db/` schema** — 直接关联 PostgreSQL，schema 变更需走 migration 流程
- **`packages/env/`** — 已配置 server/web 分离的环境校验逻辑，修改需同步更新两个 target
- **`packages/infra/.env`** — 包含 Cloudflare API token 和 account ID，已配置在 Cloudflare MCP

## 哪些目录禁止本轮需求随意变更

1. **`packages/infra/`** — Cloudflare 部署配置已验证可用
2. **`apps/web/next.config.ts`** — Next.js 编译配置已针对 Cloudflare 优化
3. **`packages/env/`** — 环境变量类型校验已正确分离 server/web
4. **所有 `.env` 文件** — 已配置 credentials

## 目录锁定规则

进入 SDLC workflow 后，任何涉及以下目录结构变更的需求，必须在 `design.md` 中明确说明"延续现有结构"或"已批准的结构调整"：

- `apps/*`
- `packages/*`
- `turbo.json`
- `pnpm-workspace.yaml`
