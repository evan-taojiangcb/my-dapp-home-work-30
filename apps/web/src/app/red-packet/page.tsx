import type { FC } from "react";
import CreateRedPacketPanel from "./CreateRedPacketPanel";
import ClaimRedPacketPanel from "./ClaimRedPacketPanel";

const RedPacketPage: FC = () => {
  return (
    <main className="flex min-h-0 flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CreateRedPacketPanel />
          <ClaimRedPacketPanel />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Connected to Sepolia testnet · USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
        </p>
      </div>
    </main>
  );
};

export default RedPacketPage;
