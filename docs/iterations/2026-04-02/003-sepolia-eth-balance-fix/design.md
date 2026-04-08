# Design — Sepolia ETH 余额显示修复

## 引用基线

- 沿用既有结构（不调整 Better-T-Stack monorepo 目录）
- 参考：`docs/iterations/2026-04-02/002-solana-wallet-ui-enhancement/` （上一轮架构决策）

## 问题定位

### 数据流现状

```
NetworkSelector
  └─ setNetworkId("ethereum-sepolia")
       └─ NetworkProvider → isSepolia = true
            └─ WalletInfoPanel
                 └─ {isSepolia ? "— ETH" : <SOL balance>}
                                   ↑ 静态字符串，无真实余额查询
```

### 修复方向

Phantom 钱包同时支持 Solana 和 Ethereum，通过 EIP-1193 接口（`window.phantom.ethereum` 或 `window.ethereum`）暴露以太坊能力。

修复策略：
1. **不触发钱包授权弹窗**：使用 `eth_accounts`（被动读取已授权账户），不用 `eth_requestAccounts`
2. **不自动切链**：不调用 `wallet_switchEthereumChain`，直接用公共 Sepolia RPC `eth_getBalance`
3. **无新 npm 依赖**：通过 `fetch` 发送 JSON-RPC 调用到公共 RPC 端点

## 新增文件

### `apps/web/src/components/wallet/solana/useEthBalance.ts`

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";

const SEPOLIA_RPC = "https://rpc.sepolia.org";

async function fetchSepoliaBalance(address: string): Promise<number> {
  const res = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });
  const json = await res.json();
  const balanceWei = BigInt(json.result ?? "0x0");
  return Number(balanceWei) / 1e18;
}

async function getEthAccountAndBalance() {
  // Phantom exposes window.phantom.ethereum (preferred) or window.ethereum
  const provider = (window as any).phantom?.ethereum ?? (window as any).ethereum;
  if (!provider) return { address: null, balance: null };

  // eth_accounts does NOT prompt the user — returns currently-authorized accounts
  const accounts: string[] = await provider.request({ method: "eth_accounts" });
  if (!accounts.length) return { address: null, balance: null };

  const address = accounts[0];
  const balance = await fetchSepoliaBalance(address);
  return { address, balance };
}

export function useEthBalance(enabled: boolean) {
  return useQuery({
    queryKey: ["eth-balance-sepolia"],
    queryFn: getEthAccountAndBalance,
    enabled,
    staleTime: 30_000,
  });
}
```

## 修改文件

### `apps/web/src/components/wallet/solana/WalletInfoPanel.tsx`

余额区段改为：

```tsx
{/* Balance */}
{isSepolia ? (
  ethLoading ? (
    <span className="animate-pulse">Loading...</span>
  ) : ethData?.balance != null ? (
    `${ethData.balance.toFixed(4)} ETH`
  ) : (
    "— ETH"
  )
) : isLoading ? (
  <span className="animate-pulse">Loading...</span>
) : isError ? (
  "— SOL"
) : balance != null ? (
  `${Number(balance).toFixed(4)} SOL`
) : (
  "— SOL"
)}
```

## 安全考量

- 不存储私钥或敏感信息
- 使用 `eth_accounts` 不触发授权，减少钓鱼攻击面
- 公共 RPC 仅用于 `eth_getBalance`（只读），不发送交易

## 目录影响

- 新增：`apps/web/src/components/wallet/solana/useEthBalance.ts`（单文件）
- 无新目录创建，沿用既有结构
