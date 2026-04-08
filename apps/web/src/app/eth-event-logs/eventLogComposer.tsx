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
import { Input } from "@my-dapp-home-work-30/ui/components/input";
import { Label } from "@my-dapp-home-work-30/ui/components/label";
import { Textarea } from "@my-dapp-home-work-30/ui/components/textarea";
import React, { useEffect, useRef, useState } from "react";
import {
  SEPOLIA_TX_BASE_URL,
  MESSAGE_TITLE_MAX_LENGTH,
  MESSAGE_CONTENT_MAX_LENGTH,
  MessageBoardWriteStatus,
} from "./constant";
import { useMessageBoardWrite } from "./useMessageBoardWrite";

interface EventLogComposerProps extends React.HTMLAttributes<HTMLDivElement> {
  onSubmitted?: (txHash: string) => void;
}

const EventLogComposer: React.FC<EventLogComposerProps> = ({
  onSubmitted,
  ...rest
}) => {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = useState("");
  const notifiedTxHashRef = useRef<string | undefined>(undefined);

  const {
    address,
    chainId,
    isConnected,
    isWrongChain,
    status,
    txHash,
    errorMsg,
    submit,
    reset,
  } = useMessageBoardWrite();

  const isProcessing =
    status === MessageBoardWriteStatus.SIGNING ||
    status === MessageBoardWriteStatus.CONFIRMING;

  useEffect(() => {
    if (!txHash) return;
    if (status !== MessageBoardWriteStatus.SUCCESS) return;
    if (notifiedTxHashRef.current === txHash) return;

    notifiedTxHashRef.current = txHash;
    onSubmitted?.(txHash);
    setTitle("");
    setContent("");
  }, [onSubmitted, status, txHash]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit({ title, content });
  }

  function handleReset() {
    setTitle("");
    setContent("");
    reset();
  }
  return (
    <div className="mt-4">
      <Card className="border-b">
        <CardHeader>
          <CardTitle>Event Log Composer</CardTitle>
          <CardDescription>
            调用 MessageBoard.writeMessage(title,content) 发送链上日志
          </CardDescription>
          <CardAction>
            <span className="rounded-none border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300">
              Target Chain {chainId}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-1.5">
              <Label>Current Account</Label>
              <span>
                {isConnected && address ? address : "Wallet not connected"}
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="message-title">
                Title ({title.length}/{MESSAGE_TITLE_MAX_LENGTH})
              </Label>
              <Input
                id="message-title"
                value={title}
                maxLength={MESSAGE_TITLE_MAX_LENGTH}
                disabled={isProcessing}
                placeholder="Input message title"
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (status === "error") reset();
                }}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="message-content">
                Content ({content.length}/{MESSAGE_CONTENT_MAX_LENGTH})
              </Label>
              <Textarea
                id="message-content"
                rows={6}
                value={content}
                maxLength={MESSAGE_CONTENT_MAX_LENGTH}
                disabled={isProcessing}
                placeholder="Input message content"
                onChange={(event) => {
                  setContent(event.target.value);
                  if (status === "error") reset();
                }}
              />
            </div>

            <div className="rounded-none border border-input bg-input/10 px-3 py-2 text-xs text-muted-foreground">
              <div>Wallet chain: {chainId ?? "unknown"}</div>
              <div>Status: {status}</div>
              {isWrongChain ? (
                <div className="mt-1 text-destructive">
                  Please switch MetaMask network to Sepolia
                </div>
              ) : null}
            </div>

            {errorMsg ? (
              <div className="rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </div>
            ) : null}

            {txHash ? (
              <div className="rounded-none border border-green-500/20 bg-green-500/5 px-3 py-2 text-xs">
                <div className="mb-1 text-green-400">Transaction Hash</div>
                <a
                  className="break-all font-mono text-blue-300 underline"
                  href={`${SEPOLIA_TX_BASE_URL}${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {txHash}
                </a>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="submit"
                size="lg"
                disabled={
                  !isConnected ||
                  isWrongChain ||
                  isProcessing ||
                  title.trim().length === 0 ||
                  content.trim().length === 0
                }
                className="flex-1"
              >
                {status === "signing"
                  ? "Waiting for wallet signature..."
                  : status === "confirming"
                    ? "Waiting for confirmation..."
                    : "发送上链"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isProcessing}
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventLogComposer;
