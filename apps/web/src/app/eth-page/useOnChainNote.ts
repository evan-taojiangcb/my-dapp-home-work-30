"use client";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toHex, hexToString, formatEther } from "viem";

/** 历史附言条目（链上历史 + 会话内新发送共用此类型） */
export type HistoryItem = {
  id: number;
  text: string;
  txHash: string;
  /** 是否来自链上历史查询（而非本次会话新发送）*/
  fromChain?: boolean;
};

/**
 * --- 状态机 ---
 *
 *   idle ──→ sending（用户点击「上链」→ MetaMask 弹窗签名中）
 *              │
 *              └──→ confirming（MetaMask 签名完成，tx 已广播到节点）
 *                      │
 *                      └──→ success（区块确认 + getTransaction 回显完成）
 *                      └──→ error（节点拒绝 / 用户拒绝签名 / 读取链上数据失败）
 *
 *   idle ──→ error（gas 估算失败 / 余额不足）
 *
 *   任意状态 ──→ idle（账号或链切换：地址/chainId 变化时自动 reset）
 *
 * 注意：estimateGas 是独立的 side-effect，不影响上述状态机流转，
 *       仅通过 isGasLoading / estimatedGas 向 UI 暴露预算信息。
 */

/**
 * 安全边界 / 不变量：
 * 1. value 永远为 0n（禁止修改）——不向任何地址转账 ETH
 * 2. to 永远是 MEMO_RECEIVER（burn address）——不可改回用户自身地址
 * 3. calldata 长度上限 500 字节（MAX_CHARS）
 */

/**
 * MEMO_RECEIVER：以太坊"黑洞地址"（burn address）
 *
 * 为何不用 `address`（用户自身）？
 * - Hardhat 本地节点把自己管理的账户视为"internal accounts"，
 *   对 from == to 且附带 data 的交易会直接拒绝：
 *   "External transactions to internal accounts cannot include data"
 * - 部分 MetaMask 版本对 EOA 自转账 + calldata 也有额外限制
 *
 * 为何选择 0x000...dEaD？
 * - 这是以太坊生态公认的 burn address，属于"外部"地址，任何节点均接受指向它的交易
 * - value = 0n，所以不会有任何 ETH 损失
 * - 链上回显通过 tx.input（calldata）读取，与 to 字段无关，功能不受影响
 */
const MEMO_RECEIVER =
  "0x000000000000000000000000000000000000dEaD" as const;

/** note 最大字节数；超出部分在 UI 层截断，sendNote 内部也会 guard */
const MAX_CHARS = 500;

/**
 * 链上笔记（OnChainNote）交易的生命周期状态机。
 *
 * 状态说明：
 * - **idle**        初始/空闲状态，用户尚未发起操作，或操作已结束（成功/失败）后的重置状态
 * - **sending**     用户已触发「上链」操作，MetaMask 签名弹窗已弹出，正在等待用户确认或拒绝
 * - **confirming**  交易签名完成，已广播到以太坊节点，正在等待区块打包确认
 * - **success**     交易已被区块确认，且链上数据回显读取成功，笔记内容已可查验
 * - **error**       交易生命周期内任意阶段失败，包括：用户拒绝签名、gas 估算失败、
 *                   节点拒绝广播、区块确认后 revert、链上数据读取失败等
 *
 * 状态流转规则：
 *   idle ──→ sending ──→ confirming ──→ success
 *              │              │
 *              ↓              ↓
 *           error          error
 *
 * 账号或 chainId 变化时，任意状态强制 reset 回 idle。
 *
 * @see 上方状态机图示（完整流转）
 */
export type NoteStatus =
  | "idle"       // 初始状态，或操作完成后重置
  | "sending"    // 等待 MetaMask 签名
  | "confirming" // 交易已广播，等待区块确认
  | "success"    // 链上确认 + 数据回显成功
  | "error";     // 任意阶段失败

/**
 * useOnChainNote hook 向 UI 层暴露的完整状态集合。
 *
 * 字段分组（生命周期视角）：
 * ───────────────────────────────────────────────────────────────
 * [身份]  address / chainId          — 随钱包切换而变化，error 时 UI 应展示"未连接"
 * [状态]  status                     — 核心状态机，决定 UI 当前应渲染哪个视图
 * [交易]  txHash                     — confirming/success 阶段需要，idle 时为 undefined
 * [回显]  onChainHex / onChainText   — 交易确认后从链上读取的回显数据
 * [错误]  errorMsg                    — status==="error" 时填充，展示给用户的友好错误
 * [预算]  hexPreview / estimatedGas / isGasLoading — 纯展示信息，不影响状态机
 * ───────────────────────────────────────────────────────────────
 */
export interface OnChainNoteState {
  /** 当前已连接钱包的地址，未连接时为 undefined */
  address: `0x${string}` | undefined;
  /** 当前网络 ID（Sepolia=11155111，Hardhat=31337），切换网络时变化 */
  chainId: number | undefined;
  /** 状态机当前阶段：idle → sending → confirming → success | error */
  status: NoteStatus;
  /** 已签名交易 hash（status===confirming/success 时有值），用于区块浏览器链接 */
  txHash: `0x${string}` | undefined;
  /** 链上回显的原始 hex（包含 0x 前缀），用于十六进制预览 */
  onChainHex: string | undefined;
  /** 链上回显解码后的 UTF-8 字符串，解码失败时为 undefined */
  onChainText: string | undefined;
  /** 错误消息（status==="error" 时填充），展示给用户 */
  errorMsg: string | undefined;
  /** 实时 hex 预览（随 noteText 变化自动更新），用于发送前核对内容 */
  hexPreview: string;
  /** 格式化后的 gas 估算费用字符串，估算失败时为 "(estimation failed)" */
  estimatedGas: string | undefined;
  /** gas 估算是否进行中（估算中显示 loading spinner） */
  isGasLoading: boolean;
  /** 链上历史附言记录（从 alchemy_getAssetTransfers 拉取），非 Alchemy 节点为空数组 */
  chainHistory: HistoryItem[];
  /** 链上历史是否正在加载 */
  isHistoryLoading: boolean;
  /** 触发「上链」流程：打开 MetaMask 签名 → 广播交易 → 等待确认 */
  sendNote: () => Promise<void>;
  /** 重置所有状态为 idle，清空 txHash / onChainData / errorMsg */
  reset: () => void;
}

export function useOnChainNote(noteText: string): OnChainNoteState {
  /**
   * useAccount（wagmi）
   * 从 wagmi context 读取当前连接的账户信息：
   * - address: `0x${string}` | undefined — 钱包地址，未连接时为 undefined
   * - chainId: number | undefined       — 当前网络 ID（Sepolia=11155111, Hardhat=31337）
   * 账户/链切换时这两个值会变化，触发下方的 reset effect。
   */
  const { address, chainId } = useAccount();

  /**
   * usePublicClient（wagmi）
   * 返回 viem PublicClient 实例 —— 只读客户端，不需要签名权限。
   * 用途：estimateGas（预算 gas）、getTransaction（读取 tx.input 做链上回显）。
   * 当账户/链切换时，wagmi 会返回新的 client，自动适配新链的 RPC 端点。
   */
  const publicClient = usePublicClient();

  /** 状态机阶段：idle | sending | confirming | success | error */
  const [status, setStatus] = useState<NoteStatus>("idle");
  /** 已签名交易的 hash（由 MetaMask 返回），用于 confirm 阶段轮询回执 */
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  /** 链上回显的原始 hex（从 tx.input 读取），用于十六进制预览区 */
  const [onChainHex, setOnChainHex] = useState<string | undefined>(undefined);
  /** 链上回显解码后的 UTF-8 字符串，解码失败时保持 undefined */
  const [onChainText, setOnChainText] = useState<string | undefined>(undefined);
  /** 错误消息（status==="error" 时展示给用户），成功/sending 时清空 */
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  /** 格式化 gas 费用字符串（例 "~0.00000123 ETH"），估算失败时为 undefined */
  const [estimatedGas, setEstimatedGas] = useState<string | undefined>(
    undefined,
  );
  /** gas 估算是否进行中（控制估算期间 spinner 显示） */
  const [isGasLoading, setIsGasLoading] = useState(false);
  /** 链上历史附言记录（通过 alchemy_getAssetTransfers 拉取） */
  const [chainHistory, setChainHistory] = useState<HistoryItem[]>([]);
  /** 链上历史加载状态 */
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  /**
   * hexPreview（实时 hex 预览）
   * toHex（viem）：将 UTF-8 字符串转为 0x 十六进制字符串。
   * 这个预览与最终发送的 calldata 完全一致，方便用户核对。
   * useMemo 依赖 noteText，每次文本变化时重新计算。
   */
  const hexPreview = useMemo(() => {
    const trimmed = noteText.slice(0, MAX_CHARS);
    return trimmed.length > 0 ? toHex(trimmed) : "";
  }, [noteText]);

  /**
   * useSendTransaction（wagmi）
   * 向已连接的钱包（MetaMask）发起签名请求，签名后广播到 RPC 节点。
   * - sendTransactionAsync: 返回 Promise<`0x${string}`>（交易 hash），用户拒绝时抛出异常
   * - isPending: 钱包弹窗等待用户签名时为 true（对应 status === "sending"）
   */
  const { sendTransactionAsync } = useSendTransaction();

  /**
   * useWaitForTransactionReceipt（wagmi）
   * 轮询（或 WebSocket）等待交易上链并获取回执。
   * - hash:    要监听的交易 hash，由 sendTransactionAsync 返回
   * - enabled: 仅在 txHash 存在且 status 为 "confirming" 时启用，避免无效轮询
   * - receipt: 包含 status（"success"/"reverted"）、blockNumber、gasUsed 等字段
   * - receiptError: 等待超时、RPC 失败等情况下的错误对象
   */
  const { data: receipt, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash && status === "confirming" },
  });

  /**
   * Effect：监听回执，链上确认后读取 tx.input 做回显
   *
   * 链上回显依赖 tx.input（calldata），不依赖 tx.to：
   * 即使 to 是 burn address，tx.input 仍然保存了我们写入的 hex 数据。
   * getTransaction 返回的 input 字段 = 发送时的 data 参数。
   */
  useEffect(() => {
    if (status !== "confirming") return;

    // receiptError：等待超时 / RPC 故障 / 节点返回错误
    if (receiptError) {
      setErrorMsg(receiptError.message ?? "Transaction confirmation failed");
      setStatus("error");
      return;
    }

    if (!receipt) return;

    // 交易上链但被回滚（out-of-gas / Revert）
    if (receipt.status === "reverted") {
      setErrorMsg("Transaction was reverted on-chain");
      setStatus("error");
      return;
    }

    async function fetchOnChainData() {
      if (!publicClient || !txHash) return;
      try {
        const tx = await publicClient.getTransaction({ hash: txHash });
        const rawHex = tx.input as string;
        setOnChainHex(rawHex);

        /**
         * hexToString（viem）：0x hex → UTF-8 字符串
         * 若 calldata 不是合法 UTF-8（如随机字节）会抛出 TypeError，
         * 此处 catch 后 fallback 显示原始 hex，不崩溃。
         */
        try {
          setOnChainText(hexToString(rawHex as `0x${string}`));
        } catch {
          // calldata 非 UTF-8，直接显示 hex
          setOnChainText("(unable to decode)");
        }
        setStatus("success");
      } catch (e) {
        setErrorMsg(
          e instanceof Error ? e.message : "Failed to read on-chain data",
        );
        setStatus("error");
      }
    }

    void fetchOnChainData();
  }, [receipt, receiptError, status, publicClient, txHash]);

  /**
   * Effect：debounce gas 估算
   *
   * publicClient.estimateGas（viem）：模拟执行交易并返回所需 gas 单位（BigInt）。
   * 不广播上链，不消耗真实 gas，仅作预算参考。
   *
   * 安全不变量：
   * - to: MEMO_RECEIVER — 与 sendNote 保持一致，防止估算和发送使用不同目标地址
   * - value: 0n — INVARIANT，禁止修改，防止意外估算含 ETH 转账的 gas
   *
   * cleanup 函数（cancelled = true）：
   * 当 noteText/address/publicClient 在 effect 还在 await 期间发生变化时，
   * React 会先调用 cleanup 取消上一轮 effect，防止陈旧的 setState 污染新状态。
   */
  useEffect(() => {
    if (!address || !noteText.trim() || !publicClient) {
      setEstimatedGas(undefined);
      setIsGasLoading(false);
      return;
    }

    let cancelled = false;
    setIsGasLoading(true);

    async function estimate() {
      if (!publicClient || !address) return;
      try {
        const data = toHex(noteText.slice(0, MAX_CHARS));
        const [gasUnits, gasPrice, balance] = await Promise.all([
          publicClient.estimateGas({
            account: address,
            to: MEMO_RECEIVER, // 必须与 sendNote 一致；INVARIANT: 0 ETH to burn address
            value: 0n, // INVARIANT: 永远为 0，禁止修改
            data,
          }),
          publicClient.getGasPrice(),
          publicClient.getBalance({ address }),
        ]);
        if (cancelled) return; // cleanup 已触发，丢弃结果

        /**
         * formatEther（viem）：BigInt wei → 人类可读 ETH 字符串
         * 例：1_000_000_000_000_000n → "0.001"
         */
        const gasCostWei = gasUnits * gasPrice;
        const gasCostEth = formatEther(gasCostWei);
        const insufficientGas = balance < gasCostWei;
        setEstimatedGas(
          insufficientGas
            ? `⚠ Insufficient gas (need ~${Number(gasCostEth).toFixed(8)} ETH)`
            : `~${Number(gasCostEth).toFixed(8)} ETH`,
        );
      } catch {
        if (!cancelled) setEstimatedGas("(estimation failed)");
      } finally {
        if (!cancelled) setIsGasLoading(false);
      }
    }

    void estimate();

    // cleanup：取消本轮 debounce effect，防止异步 setState 覆盖新状态
    return () => {
      cancelled = true;
    };
  }, [noteText, address, publicClient]);

  /**
   * Effect：账号 / 链切换时从链上拉取历史附言记录
   *
   * 使用 Alchemy 私有方法 `alchemy_getAssetTransfers` 查询
   * `from=address, to=MEMO_RECEIVER` 的历史 external 交易，
   * 对每条交易读取 tx.input 并 hexToString 解码附言文本。
   *
   * 非 Alchemy 节点（如 Hardhat）调用会抛出 JSON-RPC method not found 错误，
   * catch 后静默 fallback 为空数组，不影响功能正常使用。
   */
  useEffect(() => {
    if (!address || !publicClient) {
      setChainHistory([]);
      return;
    }

    let cancelled = false;
    setIsHistoryLoading(true);

    async function fetchChainHistory() {
      if (!publicClient || !address) return;
      try {
        // alchemy_getAssetTransfers: 查询 from→MEMO_RECEIVER 的历史交易
        // 若非 Alchemy 节点会抛出 "Method not found" 错误，见 catch 处理
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (publicClient.request as (args: any) => Promise<any>)({
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              fromAddress: address,
              toAddress: MEMO_RECEIVER,
              withMetadata: false,
              excludeZeroValue: false,
              category: ["external"],
              order: "desc",
              maxCount: "0x14", // 最多 20 条
            },
          ],
        }) as { transfers: Array<{ hash: string; blockNum: string }> };

        if (cancelled) return;

        // 并发读取每笔交易的 calldata
        const items = await Promise.all(
          result.transfers.map(async (t, idx) => {
            try {
              const tx = await publicClient.getTransaction({
                hash: t.hash as `0x${string}`,
              });
              const rawHex = tx.input;
              // 跳过无 calldata 的交易
              if (!rawHex || rawHex === "0x") return null;
              let text: string;
              try {
                text = hexToString(rawHex);
              } catch {
                return null; // 无法解码视为非附言交易，跳过
              }
              if (!text.trim()) return null;
              return {
                id: -(idx + 1), // 负数 id 区分链上历史与会话记录
                text,
                txHash: t.hash,
                fromChain: true as const,
              };
            } catch {
              return null;
            }
          }),
        );

        if (!cancelled) {
          setChainHistory(items.filter((x): x is NonNullable<typeof x> => x !== null));
        }
      } catch {
        // 非 Alchemy 节点（Hardhat 等）不支持此方法，静默 fallback
        if (!cancelled) setChainHistory([]);
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    }

    void fetchChainHistory();
    return () => {
      cancelled = true;
    };
  }, [address, chainId, publicClient]);

  /**
   * Effect：账号 / 链切换时重置所有状态
   * 当用户在 MetaMask 中切换账号或切换网络时，address / chainId 变化，
   * 旧的 txHash / status / 链上数据已失效，必须清空，防止 UI 显示错误数据。
   */
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId]);

  function reset() {
    setStatus("idle");
    setTxHash(undefined);
    setOnChainHex(undefined);
    setOnChainText(undefined);
    setErrorMsg(undefined);
    // 注意：不重置 estimatedGas / isGasLoading，由 estimateGas effect 自行管理
  }

  async function sendNote() {
    if (!address) {
      setErrorMsg("No wallet connected");
      setStatus("error");
      return;
    }

    const trimmed = noteText.slice(0, MAX_CHARS);
    if (!trimmed.trim()) {
      setErrorMsg("Note text cannot be empty");
      setStatus("error");
      return;
    }

    // 500 字节 guard（UI 层已限制，这里作为防御性检查）
    if (trimmed.length > MAX_CHARS) {
      setErrorMsg(`Note too long (max ${MAX_CHARS} chars)`);
      setStatus("error");
      return;
    }

    if (estimatedGas?.startsWith("⚠")) {
      setErrorMsg("Insufficient ETH balance to cover gas fees");
      setStatus("error");
      return;
    }

    try {
      setErrorMsg(undefined);
      setOnChainHex(undefined);
      setOnChainText(undefined);
      setStatus("sending");

      /**
       * sendTransactionAsync（wagmi）：触发 MetaMask 弹窗请求签名
       *
       * 参数说明：
       * - to:    MEMO_RECEIVER（burn address）— 不变量，禁止改为 address（用户自身）
       *          原因见文件顶部 MEMO_RECEIVER 注释
       * - value: 0n — INVARIANT，永远为 0，禁止修改，不向任何地址转账 ETH
       * - data:  toHex(trimmed) — UTF-8 note 转 hex，作为交易 calldata 写入链上
       *
       * sendTransactionAsync 返回 tx hash（已广播），不等待上链确认。
       * 上链确认由 useWaitForTransactionReceipt 负责。
       */
      const hash = await sendTransactionAsync({
        to: MEMO_RECEIVER,  // INVARIANT: burn address，不可改为用户自身地址
        value: 0n,          // INVARIANT: 永远为 0，禁止修改
        data: toHex(trimmed),
      });

      setTxHash(hash);
      setStatus("confirming");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setErrorMsg(
        msg.includes("User rejected") ? "Transaction rejected by user" : msg,
      );
      setStatus("error");
    }
  }

  return {
    address,
    chainId,
    status,
    txHash,
    onChainHex,
    onChainText,
    errorMsg,
    hexPreview,
    estimatedGas,
    isGasLoading,
    chainHistory,
    isHistoryLoading,
    sendNote,
    reset,
  };
}
