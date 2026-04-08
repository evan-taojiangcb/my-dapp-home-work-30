# Requirements — On-Chain Note 发送历史列表

**Change Size**: Micro  
**Type**: feature  
**Date**: 2026-04-07

## 需求摘要

在 `OnChainNotePanel` 页面最下方追加一个"发送历史"区块，将用户本次会话内成功发送到链上的消息以列表形式展示。

## 影响范围

- 仅影响 `apps/web/src/app/eth-page/OnChainNotePanel.tsx`
- 不涉及 API、数据模型、目录结构、部署方式变更

## 验收条件

1. 每次交易 `status === "success"` 后，发送的 noteText 和 txHash 自动追加到页面底部历史列表
2. 历史列表在最下方，不影响现有 On-Chain Echo 区块
3. 历史列表每条显示：序号、消息内容（截断）、tx hash（截断）
4. 历史为空时不显示该区块（或显示空态提示）
5. 纯前端 state 存储，刷新后清空（无需持久化）
