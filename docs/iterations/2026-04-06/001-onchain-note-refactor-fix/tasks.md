# Tasks — On-Chain Note: 重构 + 注释 + Bug 修复

### [ ] T-001 新建 `apps/web/src/app/eth-page/useOnChainNote.ts`
- [ ] 将旧 hook 逻辑迁移至页面目录
- [ ] `to` 改为 burn address `0x000...dEaD`
- [ ] estimateGas 的 `to` 同步修改  
- [ ] 补充 viem / wagmi API 中文注释

### [ ] T-002 新建 `apps/web/src/app/eth-page/OnChainNotePanel.tsx`
- [ ] 将旧组件迁移至页面目录  
- [ ] 更新 import（相对路径引用同目录 hook）
- [ ] 补充关键 UI 区块注释

### [ ] T-003 更新 `apps/web/src/app/eth-page/page.tsx`
- [ ] 将 import 从 `@/components/wallet/eth/OnChainNotePanel` 改为 `./OnChainNotePanel`

### [ ] T-004 删除旧文件
- [ ] 删除 `apps/web/src/components/wallet/eth/useOnChainNote.ts`
- [ ] 删除 `apps/web/src/components/wallet/eth/OnChainNotePanel.tsx`

### [ ] T-005 回写任务状态 + TypeScript 类型检查
- [ ] `pnpm tsc --noEmit` 通过
### [ ] T-006 Vitest 单元测试通过
