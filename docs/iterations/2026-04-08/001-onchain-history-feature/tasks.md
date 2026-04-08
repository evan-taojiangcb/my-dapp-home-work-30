# Tasks — On-Chain History Feature

## 任务清单

- [x] 1. 修改 `useOnChainNote.ts`：新增链上历史查询 Effect，导出 `chainHistory` 和 `isHistoryLoading`
- [x] 2. 修改 `OnChainNotePanel.tsx`：合并 `chainHistory` + 会话历史，去重展示，更新标题
- [x] 3. 验证能力检测（lint / type-check / unit / Playwright 可用性）
- [x] 4. 最终浏览器验收（Playwright MCP + WebMCP）
- [x] 5. 回写任务勾选状态

## 验收标准

- [x] 连接 Sepolia 钱包后，历史列表自动从链上拉取之前的附言记录
- [x] Hardhat 本地节点下历史列表为空但不报错（catch 静默 fallback）
- [x] 本次会话新发送记录立即出现且不重复（txHash 去重）
- [x] 历史加载时有 loading 指示
- [x] 无 TypeScript 编译错误（eth-page 0 errors）
