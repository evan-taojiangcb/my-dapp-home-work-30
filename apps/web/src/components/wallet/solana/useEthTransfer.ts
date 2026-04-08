"use client";
import { useQueryClient } from "@tanstack/react-query";

const SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/jYaQ0N_D69YM3lYProPxb0m0NEJX_HvX";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthProvider(): EthProvider {
  const win = window as Window &
    typeof globalThis & {
      phantom?: { ethereum?: EthProvider };
      ethereum?: EthProvider;
    };
  const provider = win.phantom?.ethereum ?? win.ethereum;
  if (!provider) throw new Error("No Ethereum provider found. Please install Phantom.");
  return provider;
}

async function pollReceipt(
  txHash: string,
  timeoutMs = 60_000
): Promise<{ status: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(SEPOLIA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: 1,
      }),
    });
    const json = (await res.json()) as { result?: { status: string } | null };
    if (json.result) return json.result;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Transaction confirmation timed out after 60s");
}

export function useEthTransfer() {
  const queryClient = useQueryClient();

  async function transfer(
    toAddress: string,
    amount: number,
    onStatus?: (s: "sending" | "confirming") => void
  ): Promise<string> {
    const provider = getEthProvider();

    const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
    if (!accounts.length) throw new Error("No Ethereum account connected in Phantom");
    const from = accounts[0];

    // Convert ETH → wei → hex (use BigInt to avoid floating-point precision issues)
    const weiValue = BigInt(Math.round(amount * 1e9)) * BigInt(1e9);
    const valueHex = "0x" + weiValue.toString(16);

    onStatus?.("sending");
    const txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: toAddress, value: valueHex }],
    })) as string;

    onStatus?.("confirming");
    const receipt = await pollReceipt(txHash);
    if (receipt.status === "0x0") {
      throw new Error("Transaction was reverted on-chain");
    }

    await queryClient.refetchQueries({ queryKey: ["eth-balance-sepolia"] });
    return txHash;
  }

  return { transfer };
}
