# Tasks — USDC 发红包功能

**关联设计**：`docs/iterations/2026-04-13/001-usdc-redpacket-feature/design.md`  
**迭代目录**：`docs/iterations/2026-04-13/001-usdc-redpacket-feature/`  
**总预估工时**：8h

---

## 任务列表

### [x] T-001 — 安装合约依赖（OpenZeppelin）
**工时**：0.5h  
**落位**：`packages/contracts`

**描述**：
- 安装 `@openzeppelin/contracts` 到 contracts workspace
- 确认 `pnpm-workspace.yaml` 不需要 catalog 条目（contracts workspace 独立管理）

**验收标准**：
- [x] `pnpm -F contracts add @openzeppelin/contracts` 成功
- [x] `packages/contracts/package.json` 含 `@openzeppelin/contracts` 依赖

---

### [x] T-002 — 编写 MockERC20.sol
**工时**：0.5h  
**落位**：`packages/contracts/contracts/MockERC20.sol`

**描述**：
- 极简 ERC20，继承 OpenZeppelin ERC20
- `decimals()` 返回 6（模拟 USDC）
- `mint(address, uint256)` 公开函数供测试使用

**验收标准**：
- [x] 合约可编译（`npx hardhat compile`）
- [x] `decimals()` 返回 6

---

### [x] T-003 — 编写 USDCRedPacket.sol
**工时**：2h  
**落位**：`packages/contracts/contracts/USDCRedPacket.sol`

**描述**：按照 design.md §1.1 完整实现：
- `RedPacket` struct + 状态变量
- `create()` 函数
- `claim()` 函数（等额 + 随机分支）
- `refund()` 函数  
- `getPacket()` view 函数
- Events：`RedPacketCreated` / `RedPacketClaimed` / `RedPacketRefunded`
- `ReentrancyGuard` 集成

**验收标准**：
- [x] `npx hardhat compile` 零 error
- [x] 等额分配：每份金额 = totalAmount / count
- [x] 随机分配：总额守恒（全部领完后 remainingAmount = 0）
- [x] 过期后 claim 应 revert
- [x] 重复 claim 同一地址应 revert
- [x] 非创建者 refund 应 revert

---

### [x] T-004 — 编写合约测试
**工时**：1.5h  
**落位**：`packages/contracts/test/USDCRedPacket.ts`

**描述**（使用 Hardhat + viem）：
1. 部署 MockERC20 + USDCRedPacket
2. 测试等额分配完整流程：create → 3 地址 claim → 验证金额
3. 测试随机分配：create → 多地址 claim → 验证总额守恒
4. 测试重复 claim revert
5. 测试未过期 refund revert
6. 测试过期后 refund 成功
7. 测试非创建者 refund revert

**验收标准**：
- [x] `npx hardhat test` 全部 PASS
- [x] 测试覆盖所有 revert 路径

---

### [x] T-005 — Hardhat Ignition 部署模块
**工时**：0.5h  
**落位**：`packages/contracts/ignition/modules/USDCRedPacket.ts`

**描述**：
- 检测当前网络，`hardhatMainnet` / `hardhatOp` → deploy MockERC20 → deploy USDCRedPacket
- Sepolia → 仅 deploy USDCRedPacket，传入 Sepolia USDC 地址参数
- 导出 `redPacketModule`

**验收标准**：
- [x] `npx hardhat ignition deploy ignition/modules/USDCRedPacket.ts --network hardhatMainnet` 成功
- [x] artifacts 中生成 `USDCRedPacket.json`

---

### [x] T-006 — 前端 constant.ts
**工时**：0.25h  
**落位**：`apps/web/src/app/red-packet/constant.ts`

**描述**：
```typescript
SEPOLIA_USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
USDC_DECIMALS = 6
RED_PACKET_CHAIN_ID = 11155111
RED_PACKET_ADDRESS = "0x..." // 部署后更新，初始为空占位
```
- 导入 USDCRedPacket ABI（artifacts）
- 导入 ERC20 ABI（OpenZeppelin 标准，或 viem erc20Abi）

**验收标准**：
- [x] TypeScript 编译无报错
- [x] ABI 可从 artifacts 正常导入

---

### [x] T-007 — useRedPacketInfo.ts
**工时**：0.5h  
**落位**：`apps/web/src/app/red-packet/useRedPacketInfo.ts`

**描述**：
- 使用 `wagmi useReadContract` 调用 `getPacket(packetId)`
- `packetId undefined / 0n` 时 disabled
- 返回格式化后的数据（amount 除以 10^6 为 USDC 显示值）
- 返回 `isExpired`、`isFull`、`isRefunded` 派生状态

**验收标准**：
- [x] 有效 packetId 返回正确数据
- [x] 无效 packetId（packetId=0 或超出已有范围）返回 `undefined`

---

### [x] T-008 — useCreateRedPacket.ts
**工时**：1h  
**落位**：`apps/web/src/app/red-packet/useCreateRedPacket.ts`

**描述**：按 design.md §2.3 实现两阶段状态机：
- Phase 1：approve USDC
- Phase 2：create red packet
- 解析 `RedPacketCreated` event 得到 `createdPacketId`
- 状态：`idle → approving → creating → confirming → success | error`

**验收标准**：
- [x] 正确处理 approve tx + create tx 两个阶段
- [x] `createdPacketId` 从 event log 解析
- [x] 任意阶段错误时 status = error，errorMsg 有值
- [x] **[Bug#1 回归]** 钱包未连接 / 错误链 / 合约地址未配置时，guard 必须同时设置 `status=ERROR` 和 `errorMsg`，UI 错误面板必须可见
- [x] **[Bug#2 回归]** approve 调用显式 `gas: 100_000n`，create 调用显式 `gas: 300_000n`，均低于 Sepolia block gas cap (16,777,216)
- [x] **[approve 等待修复]** approve 广播后必须调用 `publicClient.waitForTransactionReceipt()` 等待链上确认，confirm 后再发 create；approve 被用户取消时 catch 捕获并设置 ERROR 状态

---

### [x] T-009 — useClaimRedPacket.ts
**工时**：0.5h  
**落位**：`apps/web/src/app/red-packet/useClaimRedPacket.ts`

**描述**：
- `idle → claiming → confirming → success | error`
- 调用 `USDCRedPacket.claim(packetId)`
- 解析 `RedPacketClaimed` event → `claimedAmount`（格式化 USDC）
- `refund(packetId)` 也集成在此 hook（`isRefundMode` 参数区分）

**验收标准**：
- [x] claim 成功后 `claimedAmount` 正确
- [x] revert 时 errorMsg 可读
- [x] **[Bug#2 回归]** claim 调用显式 `gas: 200_000n`，refund 调用显式 `gas: 200_000n`，均低于 Sepolia block gas cap

---

### [x] T-010 — CreateRedPacketPanel.tsx
**工时**：1h  
**落位**：`apps/web/src/app/red-packet/CreateRedPacketPanel.tsx`

**描述**：
- 金额 input（string → parseUnits 转 6 decimal）
- 份数 input（1–100）
- 分配方式 RadioGroup（等额/随机）
- [Approve & Create] 按钮，disabled 条件：未连接 / 错误链 / 金额为0 / loading
- 两阶段 loading 文案："Approving USDC..." / "Creating Red Packet..."
- 成功展示：红包 ID 大字 + 复制按钮
- 错误：Sonner toast

**验收标准**：
- [x] 整个创建流程在正确链上可完成
- [x] 错误链提示 "Please switch to Sepolia"
- [x] 成功后展示 packetId
- [x] **[Bug#1 回归]** 合约地址未配置时点击按钮，页面必须显示 "Contract address not configured" 错误提示，而非无反应

---

### [x] T-011 — ClaimRedPacketPanel.tsx
**工时**：1h  
**落位**：`apps/web/src/app/red-packet/ClaimRedPacketPanel.tsx`

**描述**：
- 输入框：红包 ID（数字）
- [查询] 触发 useRedPacketInfo 加载状态展示
- 状态卡片：总额/已领/剩余/份数/过期时间/分配方式
- [领取] 按钮：红包有效且未领取时可点
- [退款] 按钮：已连接创建者地址 + 已过期 + 有剩余时展示
- loading 态、success toast（展示获得金额）、error toast

**验收标准**：
- [x] 查询有效红包展示正确状态
- [x] 成功领取后 claimedAmount 正确展示
- [x] 已领取时领取按钮 disabled
- [x] **[Bug#3 回归]** claim 成功后调用 `refetchInfo()` 刷新链上数据；`useRedPacketInfo` 开启 `refetchInterval: 8_000` 轮询兜底，UI 已领份数必须自动更新
- [x] **[Bug#4 回归]** 读取链上 `hasClaimed(packetId, address)` mapping；当前地址已领取时 Claim 按钮不可见，状态卡片显示 "✅ Already claimed"

---

### [x] T-012 — red-packet page.tsx + layout.tsx
**工时**：0.25h  
**落位**：`apps/web/src/app/red-packet/`

**描述**：
- `layout.tsx`：复用 eth layout（EthLayout / RainbowKit providers）
- `page.tsx`：双栏布局（CreateRedPacketPanel + ClaimRedPacketPanel），响应式（移动端垂直堆叠）

**验收标准**：
- [x] `/red-packet` 路由可访问
- [x] 页面含钱包连接按钮

---

## 总预估工时

| 任务 | 工时 |
|------|------|
| T-001 ~ T-005（合约层） | 5h |
| T-006 ~ T-012（前端层） | 3.5h |
| **合计** | **8.5h** |

---

## 执行顺序建议

```
T-001 → T-002 → T-003 → T-004 → T-005
                                    ↓
               T-006 → T-007 → T-008 → T-009 → T-010 → T-011 → T-012
```

合约层可并行于前端层进行（等 ABI 生成后前端才能确认 import）。
