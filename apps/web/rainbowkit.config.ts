import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

const env = process.env;

const alchemyKey = env.NEXT_PUBLIC_ALCHEMY_API_KEY;

const config = getDefaultConfig({
  appName: "MyDapp-Ethereum",
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [mainnet, sepolia],
  ssr: true,
  transports: {
    [mainnet.id]: http(
      alchemyKey
        ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : undefined,
    ),
    [sepolia.id]: http(
      env.NEXT_PUBLIC_SEPOLIA_RPC_URL
        ? env.NEXT_PUBLIC_SEPOLIA_RPC_URL
        : alchemyKey
          ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
          : undefined,
    ),
  },
});

export default config;
