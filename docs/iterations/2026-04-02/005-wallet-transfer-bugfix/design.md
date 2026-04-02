# Design: 005-wallet-transfer-bugfix

## 变更范围
`apps/web/src/components/wallet/solana/`

## 目录影响
- **无新增目录**：所有代码落在既有 `solana/` 目录内
- 复用现有: `useWallet`, `useNetworkContext`, `queryClient` via `@/utils/trpc`

## Bug 1 设计：账号切换同步

**根因**: ETH 侧没有 `accountsChanged` 监听器。Solana 侧 wallet-adapter 虽然更新 `publicKey`，但 react-query 缓存不会自动失效。

**方案**: 新增 `useWalletAccountSync.ts` hook
```ts
useEffect(() => {
  window.solana?.on("accountChanged", () =>
    queryClient.invalidateQueries({ queryKey: ["solana-balance"] })
  );
  (window.phantom?.ethereum ?? window.ethereum)?.on("accountsChanged", () =>
    queryClient.invalidateQueries({ queryKey: ["eth-balance-sepolia"] })
  );
}, []);
```
挂载在 `WalletInfoPanel` 中（已连接后才渲染）。

## Bug 2 设计：转账错误详情

**根因**: `wallet-adapter` 的 `sendTransaction` 调用 Phantom `signAndSendTransaction`，Phantom 报通用错误时 adapter 封装为 "Unexpected error"。

**方案**: 拆分为两步
1. `signTransaction(tx)` — Phantom 弹窗签名，捕获用户拒绝
2. `connection.sendRawTransaction(signed.serialize())` — 直接走 RPC，捕获 RPC 级别错误
3. `connection.confirmTransaction(...)` — 等待确认，捕获网络超时

## Bug 3 设计：立即刷新余额

**根因**: `invalidateQueries` 标记 stale 但只触发后台刷新，3s 后 UI reset 可能先于数据返回。

**方案**: 改用 `refetchQueries` 强制立即同步刷新
```ts
await queryClient.refetchQueries({ queryKey: ["solana-balance"] });
await queryClient.refetchQueries({ queryKey: ["eth-balance-sepolia"] });
```

## 文件清单
| 文件 | 类型 | 说明 |
|------|------|------|
| `useWalletAccountSync.ts` | NEW | Bug 1 修复 hook |
| `useSolanaTransfer.ts` | REWRITE | Bug 2 修复 |
| `useEthTransfer.ts` | UPDATE | Bug 3 修复 |
| `WalletInfoPanel.tsx` | UPDATE | 调用 useWalletAccountSync |
| `index.ts` | UPDATE | 导出 useWalletAccountSync |
