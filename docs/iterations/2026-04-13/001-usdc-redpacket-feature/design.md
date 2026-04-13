# Design — USDC 发红包功能

## 需求摘要

新增「USDC 发红包」功能，包含 Solidity 智能合约 `USDCRedPacket` 和前端页面 `/red-packet`。合约部署在 Sepolia 测试网，本地开发通过 MockERC20 模拟 USDC。前端使用 wagmi + viem 调用合约，RainbowKit 处理钱包连接。

## 目录影响声明

**沿用既有结构**，不新增 workspace 或顶层目录。

| 新增目录/文件 | 归属 | 说明 |
|------------|------|------|
| `packages/contracts/contracts/USDCRedPacket.sol` | 已有 workspace | 新增合约文件，与现有 MessageBoard.sol 平级 |
| `packages/contracts/contracts/MockERC20.sol` | 已有 workspace | 本地测试用 Mock USDC，与合约同级 |
| `packages/contracts/ignition/modules/USDCRedPacket.ts` | 已有 workspace | Hardhat Ignition 部署模块 |
| `packages/contracts/test/USDCRedPacket.ts` | 已有 workspace | 合约单元测试 |
| `apps/web/src/app/red-packet/` | 已有 workspace | 前端新路由 `/red-packet` |
| 无新增根目录 | — | 未偏离 Better-T-Stack 约定 |

**不修改**：
- `apps/server`（无后端需求）
- `packages/api`（无 tRPC 变更）
- `packages/db`（无数据库变更）
- 现有 eth-page / eth-event-logs 路由

---

## 参考历史迭代

| 迭代 | 关联要点 |
|------|---------|
| 2026-04-05/001-eth-header-wallet-feature | RainbowKit 已集成，eth layout 处理 Provider |
| 2026-04-06/001-onchain-note-refactor-fix | wagmi hook 写入合约模式，`useWriteContract` + `useWaitForTransactionReceipt` |
| 2026-04-08/001-onchain-history-feature | viem `publicClient.readContract` 读取链上数据模式 |

---

## 1. 智能合约设计

### 1.1 USDCRedPacket.sol

```solidity
// 依赖：OpenZeppelin ReentrancyGuard, IERC20
// Solidity 0.8.28，与现有合约版本一致

struct RedPacket {
    address creator;
    address token;          // USDC 合约地址
    uint256 totalAmount;    // 总存入金额（含6位精度）
    uint256 remainingAmount;
    uint32  totalCount;
    uint32  claimedCount;
    bool    isRandom;
    uint256 expiry;         // block.timestamp + 86400
    bool    refunded;
}
```

**状态变量**：
- `mapping(uint256 => RedPacket) public packets`
- `mapping(uint256 => mapping(address => bool)) public hasClaimed`
- `mapping(uint256 => mapping(address => uint256)) public claimedAmounts`
- `uint256 public nextPacketId` (从 1 开始)

**主要函数**：

| 函数 | 可见性 | 说明 |
|------|-------|------|
| `create(address token, uint256 totalAmount, uint32 count, bool isRandom)` | external | 创建红包，ERC20 transferFrom 锁定资金 |
| `claim(uint256 packetId)` | external nonReentrant | 领取一份，等额或伪随机分配 |
| `refund(uint256 packetId)` | external nonReentrant | 过期后退回剩余资金给创建者 |
| `getPacket(uint256 packetId)` | external view | 返回红包基本信息 |

**随机分配算法**：
```solidity
// 仅用于演示，生产环境应用 Chainlink VRF
uint256 rand = uint256(keccak256(abi.encodePacked(
    block.prevrandao,
    block.timestamp,
    msg.sender,
    packetId,
    packet.claimedCount
)));
uint256 remaining = packet.remainingCount - 1; // 还剩几个人没领
// 在 [1 wei, remainingAmount - remaining * 1] 区间均匀随机
uint256 maxAmount = packet.remainingAmount - remaining;
amount = (rand % maxAmount) + 1;
```

**等额分配**：
```solidity
amount = packet.totalAmount / packet.totalCount;
// 最后一个领取者获得所有剩余（处理整除余数）
if (packet.claimedCount == packet.totalCount - 1) {
    amount = packet.remainingAmount;
}
```

**Events**：
```solidity
event RedPacketCreated(uint256 indexed packetId, address indexed creator, address token, uint256 totalAmount, uint32 count, bool isRandom, uint256 expiry);
event RedPacketClaimed(uint256 indexed packetId, address indexed claimer, uint256 amount);
event RedPacketRefunded(uint256 indexed packetId, address indexed creator, uint256 amount);
```

**安全约束**：
- `ReentrancyGuard`（OpenZeppelin）防重入
- `require(amount > 0)` 防止零额转账
- `require(count >= 1 && count <= 100)` 限制份数范围
- `require(totalAmount >= count)` 保证每份至少 1 wei
- `require(!hasClaimed[packetId][msg.sender])` 防重复领取
- `require(block.timestamp < packet.expiry)` 过期检查

### 1.2 MockERC20.sol（本地测试用）

```solidity
// 极简 ERC20，仅供 Hardhat 本地网使用
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}
```

### 1.3 Hardhat Ignition 部署

`packages/contracts/ignition/modules/USDCRedPacket.ts`：
- 本地网络：先 deploy MockERC20，再 deploy USDCRedPacket
- Sepolia：参数化 USDC 地址 `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

### 1.4 合约测试

`packages/contracts/test/USDCRedPacket.ts`（Hardhat + viem）：
- 等额分配创建 → 领取 → 验证金额
- 随机分配创建 → 多地址领取 → 验证总额守恒
- 重复领取应 revert
- 过期退款验证
- 非创建者退款应 revert

---

## 2. 前端设计

### 2.1 路由结构

```
apps/web/src/app/red-packet/
├── layout.tsx           # 带 EthLayout（RainbowKit Provider）
├── page.tsx             # 包含 CreateRedPacketPanel + ClaimRedPacketPanel
├── constant.ts          # USDC 地址、合约地址、ABI 引用、链 ID
├── CreateRedPacketPanel.tsx
├── ClaimRedPacketPanel.tsx
├── useCreateRedPacket.ts
├── useClaimRedPacket.ts
└── useRedPacketInfo.ts
```

### 2.2 constant.ts

```typescript
export const SEPOLIA_USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
export const USDC_DECIMALS = 6;
export const RED_PACKET_CHAIN_ID = 11155111; // Sepolia
export const RED_PACKET_ADDRESS = "0x..."; // 部署后填入
// ABI 从 artifacts 导入
import { abi as redPacketAbi } from "@my-dapp-home-work-30/contracts/artifacts/contracts/USDCRedPacket.sol/USDCRedPacket.json";
```

### 2.3 useCreateRedPacket.ts

状态机（同 useMessageBoardWrite 模式）：

```
idle → approving → approved → creating → confirming → success | error
```

- Phase 1 `approve`：调用 USDC ERC20 `approve(redPacketAddress, amountInWei)` 
- Phase 2 `create`：调用 `USDCRedPacket.create(USDC_ADDRESS, amountInWei, count, isRandom)`
- `useWaitForTransactionReceipt` 监听 confirm
- `parseEventLogs` 解析 `RedPacketCreated` event 得到 `packetId`

### 2.4 useClaimRedPacket.ts

```
idle → claiming → confirming → success | error
```

- 调用 `USDCRedPacket.claim(packetId)`
- 解析 `RedPacketClaimed` event 得到 `amount`，格式化为 USDC（除以 10^6）

### 2.5 useRedPacketInfo.ts

使用 `wagmi useReadContract` 持续读取 `getPacket(packetId)`：
- 返回红包状态：creator、totalAmount、remaining、count、claimed、expiry、isRandom
- `packetId === 0n` 时不触发请求

### 2.6 CreateRedPacketPanel.tsx

表单字段：
1. USDC 金额（数字输入，最小 1，最大跟钱包余额联动）
2. 红包份数（1–100，整数）
3. 分配方式（等额 / 随机，RadioGroup）
4. [Approve & Create] 按钮（两步操作合并为一个流程）

显示：
- 操作进行中：Step 1 Approving... / Step 2 Creating...
- 成功：红包 ID（大字展示，可复制）
- 错误：error toast（Sonner）

### 2.7 ClaimRedPacketPanel.tsx

- 输入框：红包 ID
- [查询] 按钮 → 展示红包状态（剩余份数、过期时间、分配方式）
- [领取] 按钮（仅红包有效时可点击）
- [退款] 按钮（仅创建者且已过期时显示）
- 成功：展示获得的 USDC 金额
- 错误：toast 展示

### 2.8 layout.tsx

复用现有 eth-event-logs layout 的 EthLayout Pattern，不新建 Provider，直接包套 `<EthLayout>`（已有 RainbowKit + wagmi providers）。

---

## 3. 数据流

```
用户 → CreateRedPacketPanel
  ↓
useCreateRedPacket
  ├── wagmi writeContractAsync (USDC.approve)
  ├── waitForTransactionReceipt
  ├── wagmi writeContractAsync (USDCRedPacket.create)
  └── waitForTransactionReceipt → parse RedPacketCreated → packetId

用户 → ClaimRedPacketPanel (输入 packetId)
  ↓
useRedPacketInfo → wagmi useReadContract (getPacket) → 展示状态
  ↓
useClaimRedPacket
  └── wagmi writeContractAsync (USDCRedPacket.claim) → 展示 amount
```

---

## 4. 不修改的内容

- `packages/api`（无 tRPC 变更）
- `apps/server`（纯前端 + 链上）
- `packages/db`（无数据库变更）
- `apps/web/src/app/eth-page`（不影响现有页面）
- `apps/web/src/app/eth-event-logs`（不影响现有页面）

---

## 5. 部署说明

- **本地开发**：`pnpm -F contracts hardhat node`（或直接 `hardhat test`，不需要单独 node 进程）
- **Sepolia 部署**：`pnpm -F contracts hardhat ignition deploy ignition/modules/USDCRedPacket.ts --network sepolia`
- **ABI 同步**：部署后 artifacts 自动生成，前端 `import` 路径不需改动

---

## 6. 安全说明

参考 `.claude/SECURITY.md`，本功能关注点：

| 风险点 | 缓解措施 |
|--------|---------|
| 重入攻击 | ReentrancyGuard（checks-effects-interactions 模式） |
| 整数溢出 | Solidity 0.8+ 内置溢出检查 |
| 伪随机可预测 | 仅演示，生产应换 Chainlink VRF；合约注释说明 |
| 无限授权 | approve 仅授权本次需要金额 |
| 链 ID 校验 | 前端校验 `chainId === RED_PACKET_CHAIN_ID` |
| 过期时间操纵 | 使用 `block.timestamp`，矿工±15s 误差在可接受范围 |

---

## 7. 最终验收方式

1. Hardhat 合约测试：`npx hardhat test` 全绿
2. 前端 lint + 类型检查：`pnpm check-types`
3. Playwright MCP 功能验收：
   - 连接钱包 → 创建红包 → 记录 packetId
   - 用另一账户领取 → 验证 USDC 余额变动
