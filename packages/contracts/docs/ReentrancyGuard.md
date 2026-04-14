# ReentrancyGuard

## 1. 概述

`ReentrancyGuard` 是 OpenZeppelin 提供的一个基础修饰符合约，用于防止**重入攻击**（Reentrancy Attack）。

> 包路径：`@openzeppelin/contracts/utils/ReentrancyGuard.sol`

重入攻击发生于：攻击者在一个合约调用外部转账后，通过一个**恶意回调**再次触发同一函数，在状态更新前重复提取资产。著名的 DAO Hack（2016）即源于此。

---

## 2. 核心机制

### 2.1 修饰符 `nonReentrant`

```solidity
modifier nonReentrant() {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
    _;
    _status = _NOT_ENTERED;
}
```

原理：

| 阶段 | `_status` 值 | 说明 |
|------|-------------|------|
| 初始 | `_NOT_ENTERED`（默认 1） | 可正常进入 |
| 函数执行中 | `_ENTERED`（常量） | 任何外部调用再进来都会被 revert |
| 函数执行完毕 | `_NOT_ENTERED` | 释放锁，允许下一次调用 |

`_status` 是 `uint256` 类型，位于存储槽中，其值在调用栈中保持不变——即**跨调用持久**，这是防重入的关键。

### 2.2 `_NOT_ENTERED` 与 `_ENTERED` 的值

```solidity
uint256 private constant _NOT_ENTERED = 1;
uint256 private constant _ENTERED = 2;
```

> 使用常量而非枚举，节省部署 gas。常量在字节码中是内联的，不占用存储槽。

---

## 3. 在 USDCRedPacket 中的使用

```solidity
contract USDCRedPacket is ReentrancyGuard {
    function claim(uint256 packetId) external nonReentrant { ... }
    function refund(uint256 packetId) external nonReentrant { ... }
}
```

**为什么 claim 和 refund 需要防重入？**

- `claim()`：向调用者转账 `safeTransfer`，外部合约（如恶意代币）可以在 `tokenFallback` 中再次调用 `claim()`。
- `refund()`：向 creator 转账，同样可能触发回调。

两者均涉及 **Checks-Effects-Interactions（CEI）** 模式中"I"（Interactions）步骤——即在状态已更新后仍存在外部调用窗口，因此必须用 `nonReentrant` 作为最后一道防线。

---

## 4. CEI + nonReentrant 双重防护

USDCRedPacket 采用纵深防御：

```
claim() 执行顺序：

Step 1  Checks    → require(packet.creator != address(0))   ← 条件校验
Step 2  Effects   → hasClaimed[packetId][msg.sender] = true  ← 状态更新
                    packet.remainingAmount -= amount
Step 3  Interactions → IERC20(token).safeTransfer(...)    ← 外部调用

nonReentrant 锁在整个函数体外：即使 Effects 漏写了，_ENTERED 状态也会阻止第二次进入。
```

---

## 5. 已知局限

| 局限 | 说明 |
|------|------|
| **单线程锁** | 同一笔交易内无法防同合约不同函数互相调用（应各自加 `nonReentrant`） |
| **跨合约无效** | `nonReentrant` 只防止同一合约实例内的重入；不同部署地址不受影响 |
| **非递归防护** | 同一个 external 函数被递归调用时，第二次进入会被拦截 |

---

## 6. 使用规范

### 何时必须使用

- 合约对外转账（`transfer`、`send`、`call`、ERC-20 `safeTransfer`）
- 包含 `callback`/`onReceived` 逻辑的代币转账
- 任何更新状态后仍有外部调用的函数

### 使用注意事项

```solidity
// ✅ 正确：在函数入口处加修饰符
function withdraw() external nonReentrant {
    balances[msg.sender] = 0;
    payable(msg.sender).transfer(amount);
}

// ❌ 错误：在内部函数上加分号修饰符不起作用
function withdraw() external {
    _withdraw();
}
modifier nonReentrant() { ... }  // 这样没有保护
```

---

## 7. 相关参考

- [OpenZeppelin ReentrancyGuard 源码](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/ReentrancyGuard.sol)
- [OpenZeppelin 安全文档 - 重入攻击](https://docs.openzeppelin.com/contracts/4.x/security#reentrancy)
- 已知漏洞案例：The DAO Hack（2016）、Uniswap/Lendf.Me（2020）
