# TEST_BASELINE.md

## 现有测试目录结构

```
tests/
├── unit/
│   ├── packages/      # packages/ 测试（空目录）
│   ├── server/        # apps/server 测试（空目录）
│   └── web/           # apps/web 测试（空目录）
├── e2e/               # E2E 测试目录（空目录）
└── reports/           # 测试报告目录
    ├── chrome/        # Chrome DevTools MCP 报告
    └── webmcp/        # WebMCP 报告
```

**现状**: 测试目录由 SDLC Workflow 初始化脚本创建，但均为空目录。项目本身尚未配置任何测试框架或测试脚本。

## 现有测试/Lint/Typecheck 入口

| 类型 | 命令 | 位置 | 状态 |
|------|------|------|------|
| TypeScript 类型检查 | `pnpm check-types` → `turbo check-types` | 所有 workspace | ✅ 可用 |
| Lint | 未配置 | — | ❌ 未配置 |
| Unit Test | 未配置 | — | ❌ 未配置 |
| E2E Test | 未配置 | — | ❌ 未配置 |

## 浏览器验收能力

| 能力 | 状态 | 说明 |
|------|------|------|
| Chrome DevTools MCP | ✅ 已配置 | `chrome-devtools-mcp` 工具已配置在 MCP |
| Playwright MCP (WebMCP) | ✅ 已配置 | `mcp__playwright__*` 工具可用 |
| 最终交互验收 | ✅ 可用 | 可通过 browser_snapshot/screenshot 验收 UI |

## 缺口列表

| 缺口 | 严重程度 | 说明 |
|------|----------|------|
| 无测试框架 | 🔴 高 | 未安装 Jest/Vitest/Testing Library |
| 无 Lint 配置 | 🟡 中 | 未配置 ESLint |
| 无 E2E 测试 | 🟡 中 | 未安装 Playwright/TestCafe |
| 测试目录为空 | 🔴 高 | `tests/unit/`, `tests/e2e/` 未填充 |
| CI/CD 测试 gate | 🟡 中 | 未配置自动化测试流程 |

## 建议的测试策略

基于 Better-T-Stack 技术栈，推荐：

1. **Unit Tests**: Vitest（与 Vite/Next.js 兼容性好）
2. **Component Tests**: React Testing Library
3. **E2E Tests**: Playwright（已有 WebMCP 集成）
4. **Type Tests**: tsc --noEmit（已有）

## SDLC Workflow 测试策略

SDLC Workflow 要求在 `/tests/unit/`、`/tests/e2e/` 目录下编写测试，验收前需通过 Chrome DevTools MCP / Playwright MCP 进行浏览器交互验收。
