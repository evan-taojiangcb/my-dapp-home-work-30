# Design — On-Chain History Feature

## 需求摘要

在 `OnChainNotePanel` 中历史列表改为：钱包连接时从链上查询历史，并与会话内新发送记录合并展示。

## 无架构变更

本次改动不涉及：
- 目录结构调整
- API 契约变更
- 数据模型变更
- 新增 workspace 或 package
- 部署方式变更

沿用 existing project 既有结构。

## 影响文件

| 文件 | 变更说明 |
|------|---------|
| `apps/web/src/app/eth-page/useOnChainNote.ts` | 新增 `chainHistory`, `isHistoryLoading` 状态；新增 Effect 使用 `alchemy_getAssetTransfers` 查询历史，Hardhat 静默 fallback |
| `apps/web/src/app/eth-page/OnChainNotePanel.tsx` | 使用 `chainHistory` + 会话 `historyItems` 合并，去重，更新标题文案，增加 loading 状态展示 |

## 技术设计

### 链上历史查询

- 调用 `publicClient.request({ method: 'alchemy_getAssetTransfers', ... })` 查询 `from=address, to=MEMO_RECEIVER` 的交易
- 对每条记录调用 `getTransaction(hash)` 读取 `tx.input` 并 `hexToString` 解码
- `input === '0x'` 或解码失败的记录跳过
- 非 Alchemy RPC 调用会抛出方法不存在错误，catch 后 fallback 到空数组（Hardhat 兼容）
- 仅在 `address` 变化时重新拉取，`cancelled` flag 防止 race condition

### 去重合并

- 保持 `HistoryItem` 类型不变（id / text / txHash），新增可选 `fromChain?: true` 区分来源
- 合并逻辑：链上历史（按 blockNumber 倒序）在前，会话新增（时间顺序）在后
- 会话新增追加时，检查 txHash 是否已存在于链上历史，避免重复

### OnChainNoteInterface 新增字段

```typescript
chainHistory: HistoryItem[];
isHistoryLoading: boolean;
```

## 最终验收方式

1. Playwright 预检（lint + 类型检查）
2. 浏览器手动验证（Playwright MCP + WebMCP）
