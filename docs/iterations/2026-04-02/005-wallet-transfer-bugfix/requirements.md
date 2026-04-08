# Requirements: 005-wallet-transfer-bugfix

## 需求来源
用户反馈：转账面板上线后存在三个功能缺陷

## Bug 列表

### Bug 1: 钱包切换账号未同步到页面
**现象**: 在 Phantom 钱包内切换账号后，页面钱包地址和余额不更新
**期望**: 切换账号后，`WalletInfoPanel` 及 `TransferPanel` 立即显示新账号的数据

### Bug 2: 转账报错 WalletSendTransactionError: Unexpected error
**现象**: 点击 Send SOL 向 Phantom 发起转账request，抛出 `WalletSendTransactionError: Unexpected error`
**期望**: 转账成功，或失败时显示具体原因（用户拒绝 / RPC 错误 / 余额不足等）

### Bug 3: 转账后页面余额不刷新
**现象**: 转账成功后，余额数字不更新，刷新页面才能看到新余额
**期望**: 转账确认后，余额立即自动更新，无需手动刷新

## 验收标准
- 切换账号后 UI 立即同步
- 转账流程错误信息清晰易读
- 转账完成后余额自动刷新
- 所有已有 UI 功能（校验、MAX、网络切换）继续正常工作
