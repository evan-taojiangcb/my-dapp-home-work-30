# Design — On-Chain Note 发送历史列表

**无架构变更**

## 需求摘要

在 `OnChainNotePanel` 最下方以历史列表展示本次会话所有已成功发送的消息。

## 影响文件

| 文件 | 操作 |
|------|------|
| `apps/web/src/app/eth-page/OnChainNotePanel.tsx` | 修改 — 追加本地历史 state + 历史列表 UI |

仅改动 1 个文件，满足 mini 条件。

## 目录影响

无新增目录、无修改目录。沿用现有 `apps/web/src/app/eth-page/` 结构。

## 技术方案

1. 在 `OnChainNotePanel` 内新增 `useState<HistoryItem[]>` 管理历史
2. `HistoryItem` 类型：`{ id: number; text: string; txHash: string }`
3. 当 `status` 从非 `success` 变为 `success` 时（`useEffect` 监听），将当前 `noteText` + `txHash` push 到历史数组
4. 在组件最底部渲染历史列表区块（`histories.length > 0` 时显示）
5. 不使用 `dangerouslySetInnerHTML`，纯文本渲染（防 XSS）

## 沿用现有结构说明

引用 `docs/EXISTING_STRUCTURE.md`：`OnChainNotePanel` 为 eth-page 独立组件，本次仅在内部追加 state + UI，不改变组件边界。

## 验收方式

- Playwright MCP：观察历史列表是否在发送成功后出现
- WebMCP：交互验收，发送消息后确认历史追加
