"use client";
import { useState } from "react";
import { useOnChainNote } from "./useOnChainNote";

const MAX_CHARS = 500;

function shortenHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function OnChainNotePanel() {
  const [noteText, setNoteText] = useState("");
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
    sendNote,
    reset,
  } = useOnChainNote(noteText);

  const isProcessing = status === "sending" || status === "confirming";
  const isConnected = !!address;
  const canSend = isConnected && noteText.trim().length > 0 && !isProcessing;

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value.slice(0, MAX_CHARS);
    setNoteText(val);
    if (status === "error") reset();
  }

  function handleReset() {
    setNoteText("");
    reset();
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Loading overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm font-medium text-white">
            {status === "sending" ? "Sending transaction…" : "Waiting for confirmation…"}
          </p>
          {txHash && (
            <p className="max-w-xs break-all text-center text-xs text-gray-300">
              Hash: {txHash}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">📝 On-Chain Note</h2>
          {chainId && (
            <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-500/30">
              Chain {chainId}
            </span>
          )}
        </div>

        {/* Account address */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-400">
            Current Account
          </label>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-gray-300">
            {isConnected ? (
              <span title={address}>{address}</span>
            ) : (
              <span className="text-gray-500 italic">Not connected — please connect MetaMask</span>
            )}
          </div>
        </div>

        {/* Note text input */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400">Note Text (max {MAX_CHARS} chars)</label>
            <span
              className={`text-xs ${noteText.length >= MAX_CHARS ? "text-red-400" : "text-gray-500"}`}
            >
              {noteText.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={MAX_CHARS}
            value={noteText}
            onChange={handleTextChange}
            disabled={isProcessing}
            placeholder="Enter the note to store on-chain…"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50"
          />
        </div>

        {/* Hex preview */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-400">
            Hex Preview (calldata)
          </label>
          <textarea
            rows={2}
            readOnly
            value={hexPreview}
            placeholder="0x (hex will appear here)"
            className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-green-400 outline-none placeholder-gray-700"
          />
        </div>

        {/* Gas estimate */}
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs text-gray-500">Estimated gas:</span>
          {isGasLoading ? (
            <span className="text-xs text-gray-500 animate-pulse">calculating…</span>
          ) : estimatedGas ? (
            <span
              className={`text-xs font-medium ${
                estimatedGas.startsWith("⚠")
                  ? "text-amber-400"
                  : "text-gray-300"
              }`}
            >
              {estimatedGas}
            </span>
          ) : (
            <span className="text-xs text-gray-600">—</span>
          )}
        </div>

        {/* Error message */}
        {status === "error" && errorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Send button */}
        <button
          onClick={() => void sendNote()}
          disabled={!canSend}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isProcessing
            ? status === "sending"
              ? "Sending…"
              : "Confirming…"
            : "发送附言到区块链"}
        </button>

        {/* On-chain echo */}
        {status === "success" && txHash && (
          <div className="mt-6 space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
              ✅ On-Chain Echo
            </p>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Transaction Hash</label>
              <div
                title={txHash}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-blue-300"
              >
                {txHash}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">On-Chain Hex</label>
              <textarea
                rows={2}
                readOnly
                value={onChainHex ?? ""}
                className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-green-400 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Decoded Original Text</label>
              <textarea
                rows={3}
                readOnly
                value={onChainText ?? ""}
                className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <button
              onClick={handleReset}
              className="mt-1 text-xs text-gray-500 underline hover:text-gray-300"
            >
              Send another note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
