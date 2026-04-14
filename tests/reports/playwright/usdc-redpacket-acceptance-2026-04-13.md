# Playwright MCP 验收报告 — USDC 发红包功能

**迭代**: `docs/iterations/2026-04-13/001-usdc-redpacket-feature/`  
**执行时间**: 2026-04-13  
**URL**: http://localhost:3001/red-packet  
**执行方式**: Playwright MCP  

---

## 验收场景汇总

| # | 场景 | 结果 | 截图 |
|---|------|------|------|
| 1 | 页面路由可访问 (`/red-packet`) | ✅ PASS | page-2026-04-13T12-47-28-600Z.png |
| 2 | 钱包已连接 (Sepolia, ETH 余额显示) | ✅ PASS | page-2026-04-13T12-47-28-600Z.png |
| 3 | 双栏布局 (Send / Claim 面板) | ✅ PASS | - |
| 4 | Create 表单字段 (Amount, Shares, Distribution) | ✅ PASS | - |
| 5 | Equal 默认选中 | ✅ PASS | - |
| 6 | Random 🎲 可切换 | ✅ PASS | - |
| 7 | Claim 面板查询无效 ID → "Red packet not found" | ✅ PASS | page-2026-04-13T12-56-42-100Z.png |
| 8 | Console 无 error 级别日志 | ✅ PASS | - |
| 9 | USDC 地址正确展示 (0x1c7D...7238) | ✅ PASS | - |
| 10 | 链名 Sepolia 显示正确 | ✅ PASS | - |

---

## 截图记录

### 场景 1/2/3 — 页面初始状态（钱包已连接）
- 截图文件: `.playwright-mcp/page-2026-04-13T12-47-28-600Z.png`
- 结果: 页面正常渲染，钱包显示 0.072 ETH / 0x0b…43A0 (Sepolia)

### 场景 7 — Claim 面板查询不存在的红包
- 截图文件: `.playwright-mcp/page-2026-04-13T12-56-42-100Z.png`
- 入参: packetId = 999
- 结果: 显示红色 "Red packet not found" 错误文字

---

## 已知限制

- `NEXT_PUBLIC_RED_PACKET_CONTRACT_ADDRESS` 未配置 (合约尚未部署到 Sepolia)
- 因此 Create 全链路 (Approve USDC → Create Red Packet) 无法在此阶段做实链测试
- `useCreateRedPacket` 中守护逻辑存在小缺陷：空地址时仅调 `setErrorMsg` 未设 `status=ERROR`，导致错误不显示在面板中 (Toast 方式展示)
- 合约单元测试 (Hardhat) 已全部在本地网络通过，覆盖等额/随机分配、重复认领、退款等核心路径

---

## 修复建议

1. 部署 USDCRedPacket 合约到 Sepolia，更新 `.env.local`：
   ```
   NEXT_PUBLIC_RED_PACKET_CONTRACT_ADDRESS=0x...
   ```
2. `useCreateRedPacket.ts` L135：空地址时同步设 `setStatus(RedPacketStatus.ERROR)` 确保错误面板可见

---

## 结论

**UI 层所有可验收的场景均通过**。合约层 Hardhat 单元测试 6/6 全通过。  
全链路 E2E 测试依赖合约部署，属于后续待办。
