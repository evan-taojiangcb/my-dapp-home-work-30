"use client";

import { useState, type FC } from "react";
import EventLogComposer from "./eventLogComposer";
import EventLogHistoryList from "./eventLogHistoryList";

/**
 * Page — ETH 本地调试页面根组件
 *
 * 布局：居中最大宽度容器（max-w-2xl），适配桌面端调试视图
 */
const Page: FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [expectedTxHash, setExpectedTxHash] = useState<string | null>(null);

  function handleSubmitted(txHash: string) {
    setExpectedTxHash(txHash);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <EventLogComposer onSubmitted={handleSubmitted} />
      <EventLogHistoryList refreshKey={refreshKey} expectedTxHash={expectedTxHash} />
    </div>
  );
};

export default Page;
