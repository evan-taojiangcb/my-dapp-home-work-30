# USDCRedPacket 合约设计文档

## 1. 概述

`USDCRedPacket.sol` 是一个链上红包合约，支持任意 ERC-20 代币（当前用 USDC）。  
创建者锁入代币，分享红包 ID 给接收人，接收人在有效期内领取各自份额；到期后创建者可退回剩余代币。

---

## 2. 数据结构

```solidity
struct RedPacket {
    address creator;         // 创建者
    address token;           // ERC-20 代币地址
    uint256 totalAmount;     // 总锁入金额
    uint256 remainingAmount; // 剩余未分发金额
    uint32  totalCount;      // 总份数 (1–100)
    uint32  claimedCount;    // 已领取份数
    bool    isRandom;        // true=随机分配 / false=等额分配
    uint256 expiry;          // 过期时间戳 (创建时 + 86400s)
    bool    refunded;        // 是否已退款
}
```

辅助 mapping：

| mapping | 说明 |
|---------|------|
| `packets[packetId]` | 红包主数据 |
| `hasClaimed[packetId][addr]` | 地址是否已领取 |
| `claimedAmounts[packetId][addr]` | 地址领取金额记录 |

---

## 3. 红包生命周期状态图

```
                         create()
                            │
                            ▼
                        ┌───────┐
                        │ OPEN  │  ← 正常可领取状态
                        └───────┘
                       ╱         ╲
          所有份额领完              到期 (block.timestamp ≥ expiry)
                ╱                     ╲
               ▼                       ▼
         ┌──────────┐            ┌───────────┐
         │ CONSUMED │            │  EXPIRED  │
         └──────────┘            └───────────┘
                                       │
                             creator 调用 refund()
                             且 remainingAmount > 0
                                       │
                                       ▼
                                ┌──────────┐
                                │ REFUNDED │
                                └──────────┘
```

**状态说明**：

| 状态 | 条件 |
|------|------|
| OPEN | `claimedCount < totalCount` && `block.timestamp < expiry` && `!refunded` |
| CONSUMED | `claimedCount == totalCount`（所有份额已领完，remainingAmount 可能因等额舍入 > 0，但无法再 claim） |
| EXPIRED | `block.timestamp >= expiry` && `!refunded` |
| REFUNDED | `refunded == true` |

> 注意：合约内没有显式的枚举字段表示状态，状态是由以上几个字段的组合**派生**出来的。

---

## 4. 序时图

### 4.1 正常创建 + 等额领取全流程

```
Creator          ERC-20 (USDC)      USDCRedPacket        Claimer A / B / C
  │                   │                   │                     │
  │ approve(contract, │                   │                     │
  │  totalAmount)     │                   │                     │
  │──────────────────►│                   │                     │
  │                   │ allowance 已授权   │                     │
  │                   │                   │                     │
  │ create(token,     │                   │                     │
  │  amount, count,   │                   │                     │
  │  isRandom=false)  │                   │                     │
  │──────────────────────────────────────►│                     │
  │                   │ safeTransferFrom  │                     │
  │                   │◄──────────────────│                     │
  │                   │  tokens locked    │                     │
  │◄──────────────────────────────────────│                     │
  │  packetId = N    emit RedPacketCreated│                     │
  │                   │                   │                     │
  │                   │                   │   claim(packetId)   │
  │                   │                   │◄────────────────────│ Claimer A
  │                   │  safeTransfer     │                     │
  │                   │──────────────────►│ amount = total/count│
  │                   │                   │────────────────────►│
  │                   │                   │ emit Claimed        │
  │                   │                   │                     │
  │                   │                   │   claim(packetId)   │
  │                   │                   │◄────────────────────│ Claimer B
  │                   │  safeTransfer     │                     │
  │                   │──────────────────►│                     │
  │                   │                   │────────────────────►│
  │                   │                   │                     │
  │                   │                   │   claim(packetId)   │
  │                   │                   │◄────────────────────│ Claimer C (最后一份，含舍入余量)
  │                   │  safeTransfer     │                     │
  │                   │──────────────────►│ remainingAmount = 0 │
  │                   │                   │────────────────────►│
  │                   │                   │ emit Claimed        │
```

### 4.2 红包过期 + 退款流程

```
Creator          ERC-20 (USDC)      USDCRedPacket
  │                   │                   │
  │  (红包创建已完成，部分或全部未领取)      │
  │                   │                   │
  │  [等待 24h 过期]   │                   │
  │                   │                   │
  │ refund(packetId)  │                   │
  │──────────────────────────────────────►│
  │                   │                   │ require: msg.sender == creator ✓
  │                   │                   │ require: block.timestamp >= expiry ✓
  │                   │                   │ require: !refunded ✓
  │                   │                   │ require: remainingAmount > 0 ✓
  │                   │                   │
  │                   │  safeTransfer     │
  │                   │◄──────────────────│ packet.refunded = true
  │◄──────────────────│                   │ packet.remainingAmount = 0
  │  tokens returned  │ emit RefPacketRefunded
```

### 4.3 重复领取 / 过期领取的 revert 路径

```
Claimer              USDCRedPacket
  │                       │
  │  claim(packetId)       │
  │──────────────────────►│
  │                       │ hasClaimed[id][msg.sender] == true
  │                       │ ──► revert "already claimed"
  │◄──────────────────────│
  │    tx reverted        │

  │  claim(packetId)       │
  │──────────────────────►│
  │                       │ block.timestamp >= expiry
  │                       │ ──► revert "expired"
  │◄──────────────────────│
  │    tx reverted        │
```

---

## 5. 金额分配算法

### 5.1 等额分配（isRandom = false）

```
每份金额 = totalAmount / count   (整数除法)
最后一份 = remainingAmount        (含所有舍入余量)
```

示例：100 USDC / 3 份 → 前 2 份各 33 USDC，最后 1 份 34 USDC。

### 5.2 随机分配（isRandom = true）

每次 claim 时动态计算：

```
remaining = totalCount - claimedCount   // 还剩几份没领
maxAmount = remainingAmount - (remaining - 1)  // 保证后续每人至少 1 wei

rand = keccak256(prevrandao, timestamp, claimer, packetId, claimedCount)
amount = (rand % maxAmount) + 1

最后一份: amount = remainingAmount  // 取走全部剩余
```

> ⚠️ `prevrandao` + `timestamp` 的伪随机在主网上可被矿工/validators 影响。生产环境应使用 Chainlink VRF。

---

## 6. 安全机制

| 机制 | 说明 |
|------|------|
| `ReentrancyGuard` | `claim()` / `refund()` 均加 `nonReentrant`，防止重入攻击 |
| `SafeERC20` | 使用 `safeTransfer` / `safeTransferFrom`，兼容非标准 ERC-20 返回值 |
| Checks-Effects-Interactions | 先修改状态（`hasClaimed`, `remainingAmount`）再转账，防止重入 |
| 地址校验 | `token != address(0)`，`creator != address(0)` |
| 权限校验 | `refund()` 只有 `creator` 可调用 |
| 数量限制 | `count` 范围 1–100，防止 gas 耗尽 |

---

## 7. 事件索引

| 事件 | 触发时机 | indexed 字段 |
|------|----------|-------------|
| `RedPacketCreated` | create() 成功 | packetId, creator |
| `RedPacketClaimed` | claim() 成功 | packetId, claimer |
| `RedPacketRefunded` | refund() 成功 | packetId, creator |

---

## 8. 前端集成注意事项

1. **approve 必须先于 create**：调用 `create()` 前需对合约地址 approve `totalAmount`，且必须等 approve 交易**链上确认**后再发 create（用 `waitForTransactionReceipt` 等待）。
2. **Gas 上限**：Sepolia block gas cap = 16,777,216。建议显式设置：
   - approve: `gas: 100_000n`
   - create: `gas: 300_000n`
   - claim / refund: `gas: 200_000n`
3. **hasClaimed 状态读取**：前端需读取 `hasClaimed(packetId, address)` 链上 mapping 判断当前钱包是否已领，不能只依赖本地状态。
4. **数据刷新**：claim 成功后需主动 refetch 红包信息（`getPacket`），建议同时开启轮询（`refetchInterval: 8_000`）。
