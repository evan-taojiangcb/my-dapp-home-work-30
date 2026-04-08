"use client";

import TransferPanel from "@/components/wallet/solana/TransferPanel";
import WalletInfoPanel from "@/components/wallet/solana/WalletInfoPanel";

export default function SolanaPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <WalletInfoPanel />
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <TransferPanel />
        </section>

      </div>
    </div>
  );
}
