"use client";

import { Button } from "@my-dapp-home-work-30/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-dapp-home-work-30/ui/components/card";
import { Separator } from "@my-dapp-home-work-30/ui/components/separator";
import { Skeleton } from "@my-dapp-home-work-30/ui/components/skeleton";
import { MESSAGE_HISTORY_PAGE_SIZE, SEPOLIA_TX_BASE_URL } from "./constant";
import { useMessageHistory } from "./useMessageHistory";

type EventLogHistoryListProps = {
  refreshKey: number;
  expectedTxHash?: string | null;
};

function formatTimestamp(value: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;

  return new Date(seconds * 1000).toLocaleString();
}

function shortenHex(value: string, left = 8, right = 6) {
  if (value.length <= left + right) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

export default function EventLogHistoryList(props: EventLogHistoryListProps) {
  const { items, isLoading, isRefreshing, isSyncing, error, refetch } =
    useMessageHistory({
      refreshKey: props.refreshKey,
      pageSize: MESSAGE_HISTORY_PAGE_SIZE,
      expectedTxHash: props.expectedTxHash,
    });

  return (
    <Card className="border-border/80">
      <CardHeader className="border-b">
        <div>
          <CardTitle>Message History</CardTitle>
          <CardDescription>
            历史记录来自 The Graph 的 messages 查询结果
          </CardDescription>
        </div>

        <CardAction className="flex items-center gap-2">
          {isSyncing ? (
            <span className="rounded-none border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
              The Graph syncing...
            </span>
          ) : null}
          {isRefreshing ? (
            <span className="rounded-none border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300">
              Refreshing...
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={refetch}>
            Refresh
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-none border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
            <div className="mb-2">{error}</div>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <div className="rounded-none border border-input bg-input/10 px-3 py-6 text-center text-xs text-muted-foreground">
            No messages yet. Submit the first message above.
          </div>
        ) : null}

        {!isLoading && !error && items.length > 0 ? (
          <div className="flex flex-col">
            {items.map((item, index) => (
              <div key={item.id} className="py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    #{index + 1}
                  </div>
                </div>

                <div className="mb-3 whitespace-pre-wrap text-xs text-foreground/80">
                  {item.content}
                </div>

                <div className="grid gap-1 text-[11px] text-muted-foreground">
                  <div>Author: {shortenHex(item.author)}</div>
                  <div>Block Time: {formatTimestamp(item.blockTimestamp)}</div>
                  <div>Block Number: {item.blockNumber}</div>
                  <div>
                    Tx:{" "}
                    <a
                      className="font-mono text-blue-300 underline"
                      href={`${SEPOLIA_TX_BASE_URL}${item.transactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortenHex(item.transactionHash, 12, 8)}
                    </a>
                  </div>
                </div>

                {index < items.length - 1 ? (
                  <Separator className="mt-3" />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
