"use client";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";

export function useSolanaTransfer() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  async function transfer(
    toAddress: string,
    amount: number,
    onStatus?: (s: "sending" | "confirming") => void
  ): Promise<string> {
    if (!publicKey) throw new Error("Wallet not connected");
    if (!signTransaction) throw new Error("Wallet does not support transaction signing");

    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey,
        lamports,
      })
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Step 1: Ask Phantom to sign only (user approval happens here)
    onStatus?.("sending");
    let signedTx: Transaction;
    try {
      signedTx = await signTransaction(transaction);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Signing rejected: ${msg}`);
    }

    // Step 2: Send the raw signed transaction ourselves (better RPC error visibility)
    let signature: string;
    try {
      signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Send failed: ${msg}`);
    }

    // Step 3: Confirm on-chain
    onStatus?.("confirming");
    const result = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    if (result.value.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
    }

    // Force immediate balance refresh after successful transfer
    await queryClient.refetchQueries({ queryKey: ["solana-balance"] });
    return signature;
  }

  return { transfer };
}
