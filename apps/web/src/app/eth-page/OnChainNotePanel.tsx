"use client";
import { useState, useEffect, useRef } from "react";
import { useOnChainNote, type HistoryItem } from "./useOnChainNote";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@my-dapp-home-work-30/ui/components/card";
import { Button } from "@my-dapp-home-work-30/ui/components/button";
import { Textarea } from "@my-dapp-home-work-30/ui/components/textarea";
import { Label } from "@my-dapp-home-work-30/ui/components/label";
import { Separator } from "@my-dapp-home-work-30/ui/components/separator";

/**
 * OnChainNotePanel — eth-page 专属面板（shadcn 组件版）
 *
 * 布局说明：
 * - 相对定位容器 + 绝对定位 loading overlay，防止交易进行中用户重复操作
 * - 输入区：note 文本输入 + 实时 hex 预览（calldata 预览）+ gas 估算
 * - 操作区：「发送附言到区块链」按钮
 * - 结果区：链上回显（tx hash + onChainHex + 解码原文）
 *
 * 安全说明：
 * - onChainText 为只读 textarea，不使用 dangerouslySetInnerHTML（防 XSS）
 * - onChainHex 同上
 */

const MAX_CHARS = 500;

export default function OnChainNotePanel() {
  const [noteText, setNoteText] = useState("");
  /** 本次会话无重复新发送记录 */
  const [sessionItems, setSessionItems] = useState<HistoryItem[]>([]);
  const prevStatusRef = useRef<string | undefined>(undefined);

  /**
   * useOnChainNote（本目录自定义 hook）
   * 管理所有以太坊交互逻辑：估算 gas、发送交易、等待回执、链上回显。
   */
  const {
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
  } = useOnChainNote(noteText);

  /**
   * 合并历史：链上历史在前，会话新发在后，按 txHash 去重
   * 防止会话新发送的记录与链上历史重复显示
   */
  const chainHashSet = new Set(chainHistory.map((h) => h.txHash));
  const deduplicatedSessionItems = sessionItems.filter(
    (s) => !chainHashSet.has(s.txHash),
  );
  const historyItems = [...chainHistory, ...deduplicatedSessionItems];

  // 监側 status 变为 success，将新发记录加入会话列表
  useEffect(() => {
    if (prevStatusRef.current !== "success" && status === "success" && txHash) {
      setSessionItems((prev) => [
        ...prev,
        { id: Date.now(), text: noteText, txHash },
      ]);
    }
    prevStatusRef.current = status;
  }, [status, txHash, noteText]);

  // sending: MetaMask 弹窗等待签名；confirming: 已广播等待区块确认
  const isProcessing = status === "sending" || status === "confirming";
  const isConnected = !!address;
  const canSend = isConnected && noteText.trim().length > 0 && !isProcessing;

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value.slice(0, MAX_CHARS);
    setNoteText(val);
    // 用户重新输入时清除上一次的错误状态，允许再次提交
    if (status === "error") reset();
  }

  function handleReset() {
    setNoteText("");
    reset();
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/*
       * Loading overlay：交易进行中覆盖整个面板，防止用户重复点击
       * backdrop-blur-sm + bg-black/70 在视觉上锁定面板
       */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-none bg-black/70 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm font-medium text-white">
            {status === "sending"
              ? "Sending transaction…"
              : "Waiting for confirmation…"}
          </p>
          {txHash && (
            <p className="max-w-xs break-all text-center text-xs text-muted-foreground">
              Hash: {txHash}
            </p>
          )}
        </div>
      )}

      <Card>
        {/* Header：CardAction 自动推到右侧（grid two-column layout） */}
        <CardHeader className="border-b">
          <CardTitle>📝 On-Chain Note</CardTitle>
          {chainId && (
            <CardAction>
              <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-500/30">
                Chain {chainId}
              </span>
            </CardAction>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pt-4">
          {/* 当前账户地址 */}
          <div>
            <Label className="mb-1.5 text-muted-foreground">
              Current Account
            </Label>
            <div className="mt-1.5 rounded-none border border-input bg-input/30 px-3 py-2 font-mono text-xs text-foreground/70">
              {isConnected ? (
                <span title={address}>{address}</span>
              ) : (
                <span className="text-muted-foreground italic">
                  Not connected — please connect MetaMask
                </span>
              )}
            </div>
          </div>

          {/* Note 文本输入区 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-muted-foreground">
                Note Text (max {MAX_CHARS} chars)
              </Label>
              <span
                className={`text-xs ${
                  noteText.length >= MAX_CHARS
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {noteText.length}/{MAX_CHARS}
              </span>
            </div>
            <Textarea
              rows={4}
              maxLength={MAX_CHARS}
              value={noteText}
              onChange={handleTextChange}
              disabled={isProcessing}
              placeholder="Enter the note to store on-chain…"
            />
          </div>

          {/*
           * Hex 预览（calldata 预览）
           * 展示 toHex(noteText) 的结果，与实际发送的 tx.data 完全一致。
           * 只读 textarea 用纯文本渲染，无 HTML 注入风险。
           */}
          <div>
            <Label className="mb-1.5 text-muted-foreground">
              Hex Preview (calldata)
            </Label>
            <Textarea
              rows={2}
              readOnly
              value={hexPreview}
              placeholder="0x (hex will appear here)"
              className="mt-1.5 font-mono text-xs text-green-400 bg-black/30"
            />
          </div>

          {/* Gas 估算（来自 publicClient.estimateGas） */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Estimated gas:</span>
            {isGasLoading ? (
              <span className="text-xs text-muted-foreground animate-pulse">
                calculating…
              </span>
            ) : estimatedGas ? (
              <span
                className={`text-xs font-medium ${
                  estimatedGas.startsWith("⚠")
                    ? "text-amber-400"
                    : "text-foreground/70"
                }`}
              >
                {estimatedGas}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>

          {/* 错误提示（纯文本，不渲染 HTML） */}
          {status === "error" && errorMsg && (
            <div className="rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          {/* 发送按钮 */}
          <Button
            onClick={() => void sendNote()}
            disabled={!canSend}
            size="lg"
            className="w-full"
          >
            {isProcessing
              ? status === "sending"
                ? "Sending…"
                : "Confirming…"
              : "发送附言到区块链"}
          </Button>

          {/*
           * 链上回显区（status === "success"）
           * 展示 tx hash + 链上 hex（tx.input）+ 解码原文（hexToString）。
           * 全部使用只读 textarea，不使用 dangerouslySetInnerHTML（防 XSS）。
           */}
          {status === "success" && txHash && (
            <>
              <Separator />
              <Card size="sm" className="border-green-500/20 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                    ✅ On-Chain Echo
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div>
                    <Label className="text-muted-foreground">
                      Transaction Hash
                    </Label>
                    <div
                      title={txHash}
                      className="mt-1 rounded-none border border-input bg-black/30 px-3 py-2 font-mono text-xs text-blue-300 break-all"
                    >
                      {txHash}
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">
                      On-Chain Hex (tx.input / calldata)
                    </Label>
                    <Textarea
                      rows={2}
                      readOnly
                      value={onChainHex ?? ""}
                      className="mt-1 font-mono text-xs text-green-400 bg-black/30"
                    />
                  </div>

                  <div>
                    <Label className="text-muted-foreground">
                      Decoded Original Text
                    </Label>
                    {/* 只读纯文本，不使用 dangerouslySetInnerHTML */}
                    <Textarea
                      rows={3}
                      readOnly
                      value={onChainText ?? ""}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="self-start px-0 text-muted-foreground underline"
                  >
                    Send another note
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      {/* 发送历史列表（链上历史 + 本次会话） */}
      {(isHistoryLoading || historyItems.length > 0) && (
        <div className="mt-4 w-full">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            📜 发送历史（链上 + 本次会话）
          </p>
          {isHistoryLoading && historyItems.length === 0 ? (
            <p className="text-xs text-muted-foreground animate-pulse">
              正在从链上加载历史记录…
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {historyItems.map((item, idx) => (
                <div
                  key={item.txHash}
                  className="rounded-none border border-input bg-input/20 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      #{idx + 1}
                    </span>
                    {item.fromChain && (
                      <span className="rounded px-1 py-0.5 text-[9px] font-medium bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                        链上
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-foreground/80">
                    {item.text.length > 60
                      ? `${item.text.slice(0, 60)}…`
                      : item.text}
                  </span>
                  {chainId === 11155111 || chainId === 1 ? (
                    <a
                      href={`https://${chainId === 11155111 ? "sepolia." : ""}etherscan.io/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all font-mono text-[10px] text-blue-400/70 underline hover:text-blue-400"
                    >
                      {item.txHash}
                    </a>
                  ) : (
                    <div className="mt-1 break-all font-mono text-[10px] text-blue-400/70">
                      {item.txHash}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
