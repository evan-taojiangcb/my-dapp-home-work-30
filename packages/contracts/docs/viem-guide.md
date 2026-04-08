搜索文本 `viem` (`**/packages/contracts/**`)，17 个结果

读取 [](file:///Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/contracts/test/Counter.ts)

搜索文本 `viem` (`**/apps/web/src/**`)，无结果

读取 [](file:///Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/contracts/scripts/send-op-tx.ts)

以下是一份结合本项目实际用法的 **viem 核心教程**（中文）。

---

## viem 核心教程

`viem` 是一个面向以太坊的 TypeScript 底层库，以类型安全、轻量、高性能为核心设计目标，是 `ethers.js` / `web3.js` 的现代替代品。

---

### 1. 核心架构：Client 三件套

viem 将不同功能拆分到三类 Client：

| Client | 作用 |
|--------|------|
| `PublicClient` | 只读链上数据（余额、合约读取、事件查询） |
| `WalletClient` | 签名 / 发交易（需要账户） |
| `TestClient` | 本地测试节点专用（mine、impersonate 等） |

```ts
import { createPublicClient, createWalletClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ① PublicClient —— 只读
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth-mainnet.g.alchemy.com/v2/<KEY>"),
});

// ② WalletClient —— 写入
const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});
```

**本项目中的等效写法**（由 Hardhat viem 插件注入）：

```ts
// packages/contracts/test/Counter.ts
const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();     // → PublicClient
const [walletClient] = await viem.getWalletClients();  // → WalletClient[]
```

---

### 2. Transport（传输层）

Transport 决定如何与节点通信：

```ts
import { http, webSocket, fallback } from "viem";

http("https://rpc-url")           // HTTP/HTTPS（最常用）
webSocket("wss://rpc-url")        // WebSocket（事件订阅更高效）
fallback([http(url1), http(url2)]) // 多节点故障转移
```

---

### 3. 读取链上数据（PublicClient）

```ts
// 查询 ETH 余额
const balance = await publicClient.getBalance({
  address: "0xA0Cf798816D4b9b9866b5330EeA46a18382f251e",
});
// balance 类型是 bigint，单位 wei

// 格式化为 ETH 字符串
import { formatEther } from "viem";
console.log(formatEther(balance)); // "1.2345"

// 查询区块
const block = await publicClient.getBlockNumber();
const blockData = await publicClient.getBlock({ blockNumber: block });
```

---

### 4. 合约交互

#### 4.1 部署合约

本项目中通过 Hardhat 插件简化了部署：

```ts
// Hardhat viem 封装
const counter = await viem.deployContract("Counter");
// counter 自动带有 address、abi、read、write 方法
```

原生 viem 方式：

```ts
import { parseAbi } from "viem";

const hash = await walletClient.deployContract({
  abi,
  bytecode: "0x...",
  args: [constructorArg1],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
```

#### 4.2 读取合约状态（view / pure 函数）

```ts
// 本项目：读取 counter 的 x 值
const x = await counter.read.x(); // 返回 bigint

// 原生 viem 写法
const value = await publicClient.readContract({
  address: counter.address,
  abi: counter.abi,
  functionName: "x",
});
```

#### 4.3 写入合约（发送交易）

```ts
// 本项目：调用 inc() 方法
const txHash = await counter.write.inc();

// 带参数：调用 incBy(amount)
await counter.write.incBy([5n]); // 注意参数必须是数组，bigint 用 n 后缀

// 原生 viem 写法（需要 walletClient）
const hash = await walletClient.writeContract({
  address: counter.address,
  abi: counter.abi,
  functionName: "incBy",
  args: [5n],
});
await publicClient.waitForTransactionReceipt({ hash });
```

#### 4.4 查询合约事件

```ts
// 本项目代码：查询 Increment 事件
const events = await publicClient.getContractEvents({
  address: counter.address,
  abi: counter.abi,
  eventName: "Increment",
  fromBlock: deploymentBlockNumber,  // 起始区块
  strict: true,                      // 严格校验参数类型
});

for (const event of events) {
  console.log(event.args.by); // bigint，事件的具体参数
}
```

---

### 5. 数值类型：bigint 是关键

viem 全面使用原生 `bigint` 处理 uint256 等大整数，避免浮点精度问题：

```ts
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";

parseEther("1.5")        // → 1500000000000000000n  (wei)
formatEther(1500000000000000000n) // → "1.5"

parseUnits("100", 6)     // → 100000000n  (USDC 6位小数)
formatUnits(100000000n, 6)        // → "100"
```

---

### 6. 发送原生 ETH 交易

```ts
// scripts/send-op-tx.ts 中的用法
const [senderClient] = await viem.getWalletClients();

const txHash = await senderClient.sendTransaction({
  to: "0xRecipientAddress",
  value: parseEther("0.01"),
});

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
console.log("Status:", receipt.status); // "success" | "reverted"
```

---

### 7. ABI 编解码工具

```ts
import { parseAbi, encodeAbiParameters, decodeAbiParameters, keccak256, toHex } from "viem";

// 人类可读 ABI → viem ABI 格式
const abi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

// 手动编码参数
const encoded = encodeAbiParameters(
  [{ type: "address" }, { type: "uint256" }],
  ["0xAddress", 1000n]
);

// 哈希计算
keccak256(toHex("hello")); // → "0x..."
```

---

### 8. 本项目 Hardhat + viem 插件总结

`@nomicfoundation/hardhat-toolbox-viem` 为 Hardhat 测试环境注入了以下便利 API：

```ts
const { viem } = await network.connect();

viem.getPublicClient()          // 获取 PublicClient
viem.getWalletClients()         // 获取所有测试账户的 WalletClient[]
viem.deployContract("合约名")    // 编译 + 部署，返回带 read/write 的合约实例
viem.assertions.emitWithArgs(   // 断言某笔 tx 触发了指定事件和参数
  txPromise,
  contract,
  "EventName",
  [arg1, arg2]
)
```

---

### 9. 快速对比：viem vs ethers.js

| 特性 | viem | ethers.js v6 |
|------|------|--------------|
| 类型安全 | 完整 ABI 类型推断 | 基础类型 |
| Tree-shaking | 完全支持 | 部分 |
| bigint 支持 | 原生 bigint | 原生 bigint |
| Client 设计 | 读写分离 | Provider/Signer |
| Bundle 大小 | ~35KB | ~130KB |

---

**最常用的参考文档**：[viem.sh](https://viem.sh)，文档质量非常高，每个 API 都有 TypeScript 类型签名和示例。