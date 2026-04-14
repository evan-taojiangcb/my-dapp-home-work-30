"use client";

import {
  useAccount,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import {
  SEPOLIA_TX_BASE_URL,
  MESSAGE_TITLE_MAX_LENGTH,
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_BOARD_CHAIN_ID,
  MESSAGE_BOARD_ADDRESS,
  MessageBoardWriteStatus,
} from "./constant";

import { abi as messageBoardAbi } from "@my-dapp-home-work-30/contracts/artifacts/contracts/MessageBoard.sol/MessageBoard.json";
import { useEffect, useState } from "react";
import { parseEventLogs } from "viem";

type SubmitInput = {
  title: string;
  content: string;
};

export function useMessageBoardWrite() {
  const { address, chainId, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // 当前写入状态：idle | signing | confirming | error | success
  const [status, setStatus] = useState<MessageBoardWriteStatus>(
    MessageBoardWriteStatus.IDLE,
  );

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined); // 获取 transaction 和 hash
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined); // 获取错误信息

  // 监听到的链上事件列表
  // const [events, setEvents] = useState<
  //   Array<{ author: string; title: string; content: string; createdAt: bigint }>
  // >([]);

  // 判断当前链是否正确 我们在 Sepolia 上部署了 MessageBoard 合约，所以需要用户切换到 Sepolia 链才能正常使用写入功能
  const isWrongChain =
    typeof chainId === "number" && chainId !== MESSAGE_BOARD_CHAIN_ID; // Sepolia chainId

  // 获取交易凭证信息
  const {
    data: receipt,
    error: receiptError,
    isLoading: receiptLoading,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash && status === MessageBoardWriteStatus.CONFIRMING,
    },
  });

  // 当前状态处理,当用户提交写入请求时，状态会变为 signing；当交易被提交到链上后，状态会变为 confirming；如果交易成功完成，状态会变为 success；如果在任何阶段发生错误，状态会变为 error，并记录错误信息。
  useEffect(() => {
    // 只有在 confirming 状态下，我们才关心交易收据的变化，因为只有在这个阶段我们才会等待交易完成并获取结果
    if (status !== MessageBoardWriteStatus.CONFIRMING) return;

    if (receiptError) {
      setStatus(MessageBoardWriteStatus.ERROR);
      setErrorMsg(receiptError.message);
      return;
    }

    if (!receipt) return; // receipt 不存在时不处理

    // 交易被 EVM 回滚（revert）时，receipt.status 会是 'reverted'，我们需要单独处理这种情况以获取更准确的错误信息
    if (receipt.status === "reverted") {
      setStatus(MessageBoardWriteStatus.ERROR);
      setErrorMsg("Transaction was reverted by the EVM");
      return;
    }

    if (receipt.status === "success") {
      setStatus(MessageBoardWriteStatus.SUCCESS);
    }
  }, [receipt, receiptError, status, receipt?.status]);

  // 重制状态函数
  function reset() {
    setStatus(MessageBoardWriteStatus.IDLE);
    setTxHash(undefined);
    setErrorMsg(undefined);
  }

  // 监听重制状态，当用户切换账户或网络时，重置写入状态和相关信息
  useEffect(() => {
    reset();
  }, [address, chainId]);

  async function submit(input: SubmitInput) {
    const title = input.title.trim();
    const content = input.content.trim();

    if (!isConnected) {
      setErrorMsg("Please connect your wallet first");
      setStatus(MessageBoardWriteStatus.ERROR);
      return;
    }

    if (isWrongChain) {
      setErrorMsg("Please switch wallet network to Sepolia");
      setStatus(MessageBoardWriteStatus.ERROR);
      return;
    }

    if (!title) {
      setErrorMsg("Title cannot be empty");
      setStatus(MessageBoardWriteStatus.ERROR);
      return;
    }

    if (!content) {
      setErrorMsg("Content cannot be empty");
      setStatus(MessageBoardWriteStatus.ERROR);
      return;
    }

    if (title.length > MESSAGE_TITLE_MAX_LENGTH) {
      setErrorMsg(`Title too long, max ${MESSAGE_TITLE_MAX_LENGTH} chars`);
      setStatus(MessageBoardWriteStatus.ERROR);
      return;
    }

    if (content.length > MESSAGE_CONTENT_MAX_LENGTH) {
      setErrorMsg(`Content too long, max ${MESSAGE_CONTENT_MAX_LENGTH} chars`);
      setStatus(MessageBoardWriteStatus.ERROR);
      return;
    }

    try {
      setErrorMsg(undefined);
      setStatus(MessageBoardWriteStatus.SIGNING);

      const hash = await writeContractAsync({
        address: MESSAGE_BOARD_ADDRESS,
        abi: messageBoardAbi,
        functionName: "writeMessage",
        args: [title, content],
        chainId: MESSAGE_BOARD_CHAIN_ID,
      });

      setTxHash(hash);
      setStatus(MessageBoardWriteStatus.CONFIRMING);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit transaction";
      setErrorMsg(
        message.includes("User rejected") || message.includes("User denied")
          ? "Transaction rejected by user"
          : message,
      );
      setStatus(MessageBoardWriteStatus.ERROR);
    }
  }

  // 第一种方式 实时监听事件，获取最新的链上事件日志。当有新的 MessageWritten 事件被触发时，onLogs 回调函数会被调用，我们可以在这里解析事件日志并更新组件状态以显示最新的消息列表。
  useWatchContractEvent({
    address: MESSAGE_BOARD_ADDRESS,
    abi:messageBoardAbi,
    eventName:"MessageWritten",
    onLogs:(logs) => {
      const newEvents = logs.map((log) => {
        const { author, title, content, createdAt } = (log as any)?.args || {};
        return { author, title, content, createdAt };
      });
      console.log("New events from watch:", newEvents);
      // setEvents((prevEvents) => [...prevEvents, ...newEvents]);
    }
  })

  //第二种方式 在交易完成后解析事件日志，获取本次交易触发的事件详情。当 receipt 发生变化时，我们检查交易是否成功，如果成功，我们使用 parseEventLogs 函数从交易收据中的日志中提取 MessageWritten 事件的信息，并更新组件状态以显示最新的消息列表。
  useEffect(() => {
    if (!receipt) return;
    if (receipt.status !== "success") return; // 只有当交易成功时，我们才去解析事件日志，因为只有成功的交易才会在链上产生有效的事件

    const parsedEvents = parseEventLogs({
      abi: messageBoardAbi,
      logs: receipt.logs,
      eventName: "MessageWritten",
    });

    const newEvents = parsedEvents.map((log) => {
      const { author, title, content, createdAt } = (log as any)?.args || {};
      return { author, title, content, createdAt };
    });
    console.log("Parsed events from receipt:", newEvents);
    // setEvents(newEvents);
  }, [receipt]);

  return {
    address,
    chainId,
    isConnected,
    isWrongChain,
    status,
    txHash,
    errorMsg,
    submit,
    reset,
    // events,
  };
}
