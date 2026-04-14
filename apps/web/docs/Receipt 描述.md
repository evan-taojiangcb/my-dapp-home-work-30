`useWaitForTransactionReceipt` 返回的 `receipt` 是 viem 的 `TransactionReceipt` 类型，结构如下：

```typescript
{
  // 交易基本信息
  transactionHash: `0x${string}`       // 交易哈希
  transactionIndex: number             // 在区块中的位置索引
  blockHash: `0x${string}`             // 所在区块哈希
  blockNumber: bigint                  // 所在区块号
  from: `0x${string}`                  // 发送方地址
  to: `0x${string}` | null             // 接收方地址（合约创建时为 null）
  contractAddress: `0x${string}` | null // 若为合约部署，返回新合约地址

  // Gas 信息
  gasUsed: bigint                      // 本笔交易实际消耗的 gas
  cumulativeGasUsed: bigint            // 区块内截止本交易累计消耗的 gas
  effectiveGasPrice: bigint            // 实际支付的 gas 单价（wei）

  // 执行结果
  status: "success" | "reverted"       // 交易是否成功

  // 事件日志（核心）
  logs: Array<{
    address: `0x${string}`             // 触发事件的合约地址
    topics: [`0x${string}`, ...`0x${string}`[]]  // [事件签名哈希, ...indexed 参数]
    data: `0x${string}`                // ABI 编码的 non-indexed 参数
    blockNumber: bigint
    blockHash: `0x${string}`
    transactionHash: `0x${string}`
    transactionIndex: number
    logIndex: number                   // 在本区块中的 log 编号
    removed: boolean                   // 若区块被重组则为 true
  }>

  // EIP-2718 类型
  type: "legacy" | "eip2930" | "eip1559" | "eip4844"

  // 其他（EIP-1559 及以上）
  logsBloom: `0x${string}`             // Bloom 过滤器，用于快速检索日志
  root?: `0x${string}`                 // 仅 pre-Byzantium 区块存在
}
```

**最常用的字段：**

| 字段 | 典型用途 |
|------|---------|
| `status` | 判断交易成功 / revert |
| `logs` | 配合 `parseEventLogs` 解码合约事件 |
| `transactionHash` | 生成 Etherscan 链接 |
| `blockNumber` | 确认已上链的区块高度 |
| `gasUsed` | 显示实际消耗 gas |
| `contractAddress` | 部署合约后拿到新合约地址 |