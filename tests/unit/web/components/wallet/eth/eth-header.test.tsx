import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { WagmiProvider, QueryClient, ConnectButton } from "@rainbow-me/rainbowkit";
import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import EthHeader from "@/components/wallet/eth/eth-header";

// Create a test config for wagmi
const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <EthHeader />
    </QueryClientProvider>
  </WagmiProvider>
);

// Note: ConnectButton from RainbowKit requires full context setup.
// This test verifies the component renders the header structure.

describe("EthHeader", () => {
  it("renders header with app title", () => {
    const { getByText } = render(<EthHeader />, { wrapper });
    expect(getByText("My ETH Dapp")).toBeInTheDocument();
  });

  it("renders connect button", () => {
    const { container } = render(<EthHeader />, { wrapper });
    // ConnectButton renders a button element
    expect(container.querySelector("button")).toBeInTheDocument();
  });
});
