"use client";
import { useNetworkContext, NETWORKS, type NetworkId } from "./NetworkProvider";
import { toast } from "sonner";

export default function NetworkSelector() {
  const { networkId, setNetworkId } = useNetworkContext();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as NetworkId;
    if (next === "ethereum-sepolia") {
      toast("请安装 Ethereum 钱包以连接 Sepolia 网络");
      // Reset to current network so selector shows the real selection
      return;
    }
    setNetworkId(next);
  }

  return (
    <select
      value={networkId}
      onChange={handleChange}
      className="rounded border bg-card px-2 py-1 text-sm cursor-pointer"
    >
      {(Object.entries(NETWORKS) as [NetworkId, typeof NETWORKS[NetworkId]][]).map(
        ([id, net]) => (
          <option key={id} value={id}>
            {net.label} ({net.symbol})
          </option>
        )
      )}
    </select>
  );
}
