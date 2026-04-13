# Requirements — USDC 发红包功能

## 需求来源

用户输入："帮我开发一个 USDC 发红包的功能，需要有合约以及前端交互能力。"

## 需求摘要

在现有 DApp 中新增「USDC 发红包」功能模块。用户通过连接 Ethereum 钱包（Sepolia 测试网）将 USDC 锁入智能合约形成「红包」，其他用户凭红包 ID 领取。未被领取的份额在过期后可由创建者退回。

---

## 功能需求

### REQ-001 — 创建红包  [✅ 已确认]

**描述**：已连接钱包的用户可以创建一个 USDC 红包。

**输入**：
- USDC 总金额（正整数，单位：USDC，最小 1 USDC）  
- 红包份数（1–100，整数）
- 分配方式：等额（平均分配）或随机（基于链上伪随机）

**行为**：
1. 前端先调用 USDC ERC20 合约的 `approve` 授权合约转款
2. 调用 `USDCRedPacket.create(totalAmount, count, isRandom)` 锁定 USDC
3. 合约生成唯一红包 ID（`packetId`），过期时间默认 24 小时
4. 前端展示红包 ID，供发送给接收方

**验收**：
- [ ] 创建成功后展示 `packetId`  
- [ ] 创建失败（余额不足、未授权）显示明确错误信息  
- [ ] 只能在 Sepolia 链上操作（错误链提示切换）

---

### REQ-002 — 领取红包  [✅ 已确认]

**描述**：任意已连接钱包用户输入有效的 `packetId` 领取 USDC。

**行为**：
1. 调用 `USDCRedPacket.claim(packetId)`
2. 合约将该地址应得的 USDC 转给调用者
3. 同一地址只能领取一次；红包领完或过期不可领取

**验收**：
- [ ] 领取成功展示获得的 USDC 金额  
- [ ] 重复领取、红包已满、过期时显示错误  
- [ ] 份数领完后状态更新为"已抢完"

---

### REQ-003 — 过期退款  [✅ 已确认]

**描述**：红包过期（24h）后，创建者可将未领取的 USDC 退回。

**行为**：
1. 调用 `USDCRedPacket.refund(packetId)`
2. 合约将 `remainingAmount` 退给 `creator`

**验收**：
- [ ] 只有创建者且已过期才能退款  
- [ ] 退款成功展示退回金额  
- [ ] 未过期时退款按钮不可点击 / 操作被合约拒绝

---

### REQ-004 — 红包状态查询  [✅ 已确认]

**描述**：前端能读取指定 `packetId` 的红包信息。

**字段**：
- 创建者地址
- 总金额 / 已领取金额 / 剩余金额
- 总份数 / 已领份数
- 过期时间
- 分配方式

**验收**：
- [ ] 输入任意 `packetId` 可查询到红包当前状态  
- [ ] 无效 `packetId` 显示"红包不存在"

---

### REQ-005 — 前端 UI 页面  [✅ 已确认]

**描述**：新增 `/red-packet` 路由，包含以下两个功能区：

- **发红包**：表单（金额、份数、分配方式）+ 操作按钮（Approve → Create）
- **领红包**：输入红包 ID + 领取按钮 + 状态展示

**验收**：
- [ ] 页面带 RainbowKit 连接钱包入口  
- [ ] 等待交易时显示 loading 状态  
- [ ] 错误时以 toast 展示  
- [ ] 响应式布局，适配桌面端

---

## 非功能需求

### REQ-006 — 测试网络  [✅ 已确认]

- 合约部署目标：Sepolia 测试网
- 本地开发：Hardhat 内置网络模拟（使用 MockERC20 替代 USDC）
- 本地 Hardhat 测试中 `isRandom=true` 的确定性验证通过固定 block 条件实现

### REQ-007 — 安全约束  [⚠️ 假设：已知合理安全边界，高值生产合约应用 Chainlink VRF]

- 随机分配使用 `keccak256(block.prevrandao, block.timestamp, sender, nonce)` 伪随机
- 最小领取金额保护：每份至少 1 wei（防止零额分配）
- 重入攻击保护：使用 `ReentrancyGuard`（OpenZeppelin）
- USDC 授权上限：仅授权本次需要的金额

### REQ-008 — 不需要后端  [✅ 已确认]

所有功能纯链上 + 前端实现，无需 tRPC/Server 端变更。

---

## 技术约束

| 约束 | 说明 |
|------|------|
| 网络 | Sepolia 测试网，Hardhat 本地网（开发） |
| USDC | Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`（Circle 官方 Sepolia USDC） |
| 合约语言 | Solidity 0.8.28（与现有合约版本一致） |
| 前端框架 | Next.js 16 App Router，wagmi + viem |
| 钱包 | RainbowKit（已集成） |
| 合约工具 | Hardhat（已存在于 packages/contracts） |

---

## 范围外（Out of Scope）

- ❌ Solana 链上的红包（本次仅 Ethereum Sepolia）
- ❌ Layer 2（Optimism、Base 等）
- ❌ 真实主网部署
- ❌ 社交分享链接（QR Code 等）
- ❌ 多 Token 支持（本次仅 USDC）
