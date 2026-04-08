"use client";

import React, { useEffect, useState } from "react";

import {
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_HISTORY_PAGE_SIZE,
  MESSAGE_BOARD_GRAPH_ENDPOINT,
} from "./constant";

export type MessageHistoryItem = {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
};

type GraphResponse = {
  data?: {
    messages?: MessageHistoryItem[];
  };
  errors?: Array<{ message: string }>;
};

const QUERY = `
  query Messages($first: Int!) {
    messages(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      author
      title
      content
      createdAt
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

type UseMessageHistoryParams = {
  refreshKey?: number;
  pageSize?: number;
  expectedTxHash?: string | null;
};

export function useMessageHistory(params?: UseMessageHistoryParams) {
  const refreshKey = params?.refreshKey ?? 0;
  const pageSize = params?.pageSize ?? MESSAGE_HISTORY_PAGE_SIZE;
  const expectedTxHash = params?.expectedTxHash ?? null;

  const [items, setItems] = useState<MessageHistoryItem[]>([]); //列表数据
  const [isLoading, setIsLoading] = useState(true); //是否正在加载
  const [isRefreshing, setIsRefreshing] = useState(false); //是否正在刷新（区别于初始加载）
  const [isSyncing, setIsSyncing] = useState(false); //是否正在等待 The Graph 同步新数据（针对提交后新数据未立即可见的情况）
  const [error, setError] = useState<string | undefined>(undefined); //错误信息
  const [retrySeed, setRetrySeed] = useState(0); //用于触发重试的 state，每次调用 refetch 时增加

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    // 获取消息历史列表
    async function requestMessages() {
      const response = await fetch(MESSAGE_BOARD_GRAPH_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            first: pageSize,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Graph request failed: ${response.status}`);
      }

      const json = (await response.json()) as GraphResponse;

      if (json.errors?.length) {
        throw new Error(json.errors[0]?.message ?? "Graph query failed");
      }

      return json.data?.messages ?? [];
    }

    async function run() {
      if (!MESSAGE_BOARD_GRAPH_ENDPOINT) {
        setError("NEXT_PUBLIC_MESSAGE_BOARD_GRAPH_ENDPOINT is missing");
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSyncing(false);
        return;
      }

      setError(undefined);
      if (items.length === 0) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const firstBatch = await requestMessages();
        if (cancelled) return;

        setItems(firstBatch);
        setIsLoading(false);
        setIsRefreshing(false);

        if (!expectedTxHash) {
          setIsSyncing(false);
          return;
        }

        // 如果预期的交易哈希已经在第一批数据中，说明 The Graph 已经同步了相关数据，无需进入轮询等待
        const foundImmediately = firstBatch.some(
          (item) =>
            item.transactionHash.toLowerCase() === expectedTxHash.toLowerCase(),
        );

        if (foundImmediately) {
          setIsSyncing(false);
          return;
        }

        setIsSyncing(true);

        // 轮询等待 The Graph 同步数据，直到在查询结果中找到预期的交易哈希，或者尝试一定次数后放弃
        let attempt = 0;
        async function poll() {
          attempt += 1;

          try {
            const nextBatch = await requestMessages();
            if (cancelled) return;

            setItems(nextBatch);

            const found = nextBatch.some(
              (item) =>
                item.transactionHash.toLowerCase() ===
                expectedTxHash.toLowerCase(),
            );

            if (found || attempt >= 5) {
              setIsSyncing(false);
              return;
            }

            timer = window.setTimeout(() => {
              void poll();
            }, 2000);
          } catch (pollError) {
            if (cancelled) return;
            setError(
              pollError instanceof Error
                ? pollError.message
                : "Graph poll failed",
            );
            setIsSyncing(false);
          }
        }

        timer = window.setTimeout(() => {
          void poll();
        }, 2000);
      } catch (requestError) {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load message history",
        );
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSyncing(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [refreshKey, pageSize, expectedTxHash, retrySeed]);

  function refetch() {
    setRetrySeed((value) => value + 1);
  }

  return { items, isLoading, isRefreshing, isSyncing, error, refetch };
}
