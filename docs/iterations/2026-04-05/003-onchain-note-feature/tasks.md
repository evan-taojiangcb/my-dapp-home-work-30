# Tasks — 数据上链（On-Chain Note）

## 预估工时: 3h

---

### [x] T-001 实现 `useOnChainNote` hook
**文件**: `apps/web/src/components/wallet/eth/useOnChainNote.ts`
**验收标准**:
- [x] 使用 wagmi `useAccount` 获取 address
- [x] 使用 wagmi `useSendTransaction` 发交易（value=0, data=toHex(text)）
- [x] 使用 wagmi `useWaitForTransactionReceipt` 等待确认
- [x] 使用 viem `publicClient.getTransaction` 读取链上 input data
- [x] gas 预检：estimateGas + getBalance，不足时 errorMsg
- [x] 账号切换自动 reset（useEffect 依赖 address）
- [x] hexPreview 实时计算（useMemo）

### [x] T-002 实现 `OnChainNotePanel` 组件
**文件**: `apps/web/src/components/wallet/eth/OnChainNotePanel.tsx`
**验收标准**:
- [x] 顶部显示账号地址 + 当前网络 badge
- [x] textarea 输入框，最大 500 字符，右下角显示字符计数
- [x] 只读 hex 预览框，实时联动
- [x] 估算 gas 展示区（loading/error/value 三态）
- [x] "发送附言到区块链"按钮，未连接/空文本/处理中时禁用
- [x] 全屏 loading overlay（sending/confirming 时覆盖整个面板）
- [x] loading 期间显示当前 txHash（如已产生）
- [x] 回显区（success 后）：hash、onChainHex、原文
- [x] error 状态显示错误信息 + 重试按钮

### [x] T-003 更新 `eth-page/page.tsx`
**文件**: `apps/web/src/app/eth-page/page.tsx`
**验收标准**:
- [x] 引入并渲染 `OnChainNotePanel`
- [x] 页面有适当的 padding/max-width 布局
