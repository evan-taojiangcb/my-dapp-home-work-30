# Design — 转账 Panel

## 引用基线

- 沿用既有结构（Better-T-Stack monorepo）
- 参考 003-sepolia-eth-balance-fix（EIP-1193 接口获取 Ethereum provider）
- 参考 001/002（Solana wallet-adapter 使用模式）

## 架构设计

### 状态机

```
idle ──→ validating ──→ sending ──→ confirming ──→ success
   ↖_________________________↙               ↘___→ error
```

状态类型：
```ts
type TxStatus = "idle" | "validating" | "sending" | "confirming" | "success" | "error";
```

### 组件树

```
TransferPanel              (UI + 表单状态管理)
  ├─ useSolanaTransfer     (Solana 转账逻辑)
  └─ useEthTransfer        (Ethereum 转账逻辑)
```

`TransferPanel` 通过 `useNetworkContext().isSepolia` 决定调用哪个 hook。

---

## 新增文件

### `useSolanaTransfer.ts`

```ts
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";

export function useSolanaTransfer() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  async function transfer(toAddress: string, amount: number) {
    if (!publicKey) throw new Error("Wallet not connected");
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);

    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: publicKey, toPubkey, lamports })
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    const sig = await sendTransaction(transaction, connection);
    // status: confirming
    const { value } = await connection.confirmTransaction(sig, "confirmed");
    if (value.err) throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);

    // Invalidate balance
    await queryClient.invalidateQueries({ queryKey: ["solana-balance"] });
    return sig;
  }

  return { transfer };
}
```

### `useEthTransfer.ts`

```ts
// Uses EIP-1193 window.phantom.ethereum / window.ethereum
// eth_sendTransaction → eth_getTransactionReceipt polling

export function useEthTransfer() {
  const queryClient = useQueryClient();

  async function transfer(toAddress: string, amount: number) {
    const provider = getEthProvider(); // same helper as useEthBalance
    const accounts = await provider.request({ method: "eth_accounts" });
    const from = accounts[0];
    // Convert ETH → wei hex
    const weiHex = "0x" + (BigInt(Math.round(amount * 1e18))).toString(16);
    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: toAddress, value: weiHex }],
    });
    // Poll for receipt (up to 60s)
    const receipt = await pollReceipt(txHash);
    if (receipt.status === "0x0") throw new Error("Transaction reverted");
    await queryClient.invalidateQueries({ queryKey: ["eth-balance-sepolia"] });
    return txHash;
  }

  return { transfer };
}
```

### `TransferPanel.tsx`

```tsx
"use client";
export default function TransferPanel() {
  const { isSepolia, network } = useNetworkContext();
  const { publicKey, connected } = useWallet();
  const { data: solBalance } = useSolanaBalance(publicKey ?? null);
  const { data: ethData } = useEthBalance(isSepolia);
  const { transfer: solTransfer } = useSolanaTransfer();
  const { transfer: ethTransfer } = useEthTransfer();

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const currentBalance = isSepolia ? (ethData?.balance ?? 0) : (solBalance ?? 0);
  const symbol = network.symbol;
  const isProcessing = status === "sending" || status === "confirming";

  // Validation
  function validate(): string | null {
    if (!toAddress) return "Recipient address is required";
    if (isSepolia && !/^0x[0-9a-fA-F]{40}$/.test(toAddress))
      return "Invalid Ethereum address";
    if (!isSepolia) {
      try { new PublicKey(toAddress); } catch { return "Invalid Solana address"; }
    }
    const selfAddress = isSepolia ? ethData?.address : publicKey?.toBase58();
    if (selfAddress && toAddress.toLowerCase() === selfAddress.toLowerCase())
      return "Cannot send to your own address";
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) return "Enter a valid amount";
    const maxSend = Math.max(0, currentBalance - 0.001);
    if (n > maxSend) return `Insufficient balance (max: ${maxSend.toFixed(4)} ${symbol})`;
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setErrMsg(err); return; }
    setErrMsg(null);
    setStatus("sending");
    try {
      const tx = await (isSepolia
        ? ethTransfer(toAddress, parseFloat(amount))
        : solTransfer(toAddress, parseFloat(amount)));
      setTxId(tx);
      setStatus("success");
      // Auto reset
      setTimeout(() => { setToAddress(""); setAmount(""); setStatus("idle"); setTxId(null); }, 3000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }
}
```

## 安全考量

- 不存储私钥，所有签名通过 Phantom 钱包完成
- `eth_sendTransaction` 需要用户在 Phantom 弹窗中确认（不绕过签名）
- 金额校验在本地进行，不依赖服务端
- 转账前检查地址格式，防止发送到无效地址造成资产损失
- 自身地址校验防止无效转账

## 目录影响

- 新增：`apps/web/src/components/wallet/solana/TransferPanel.tsx`
- 新增：`apps/web/src/components/wallet/solana/useSolanaTransfer.ts`
- 新增：`apps/web/src/components/wallet/solana/useEthTransfer.ts`
- 修改：`apps/web/src/app/page.tsx`（添加 TransferPanel section）
- 修改：`apps/web/src/components/wallet/solana/index.ts`（添加导出）
- 沿用既有目录结构，无新目录创建
