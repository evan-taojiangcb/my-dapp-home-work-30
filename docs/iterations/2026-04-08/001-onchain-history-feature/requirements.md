# Requirements — On-Chain History Feature

**Change Size**: Micro
**Date**: 2026-04-08
**Iteration**: 001

## 需求摘要

当前"发送历史（本次会话）"列表仅追踪当前会话内新发送的附言记录。
需求：在钱包连接后，从链上（以太坊历史交易记录）查询当前地址发送到 `MEMO_RECEIVER` 的历史附言，
与当前会话新发送的记录合并展示，去重后按时间倒序显示（链上历史 + 本次会话新增）。

## 影响范围

- `apps/web/src/app/eth-page/useOnChainNote.ts` — 增加链上历史查询逻辑
- `apps/web/src/app/eth-page/OnChainNotePanel.tsx` — 更新历史列表显示合并结果

## 验收条件

1. 钱包连接后，历史列表自动从链上拉取之前的附言记录
2. 本次会话发送新附言后，立即追加到列表末尾（不等待页面刷新）
3. txHash 去重，不出现重复条目
4. Alchemy 节点（Sepolia）正常工作；Hardhat 本地节点静默 fallback 为空（不报错）
5. 历史拉取中显示 loading 状态
6. 历史列表标题从"本次会话"改为"发送历史（链上 + 本次会话）"
